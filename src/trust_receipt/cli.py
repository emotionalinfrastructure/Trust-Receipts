"""Command-line conformance and receipt harness."""

from __future__ import annotations

import argparse
from copy import deepcopy
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import sys
from typing import Any

from .engine import assess_conformance, evaluate_gate
from .integrity import verify_digest
from .pipeline import create_receipt
from .renderer import render_receipt
from .validation import ValidationFailure, load_json, require_valid


ROOT = Path(__file__).resolve().parents[2]


def _write_json(path: str | Path, value: Any) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def _write_text(path: str | Path, value: str) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(value, encoding="utf-8")


def _schema(name: str) -> dict[str, Any]:
    candidates = []
    configured_root = os.environ.get("TRUST_RECEIPT_ROOT")
    if configured_root:
        candidates.append(Path(configured_root) / "schemas" / name)
    candidates.extend(
        [
            ROOT / "schemas" / name,
            Path.cwd() / "schemas" / name,
            Path(sys.prefix) / "share" / "trust-receipt" / "schemas" / name,
            Path(__file__).resolve().parents[1] / "share" / "trust-receipt" / "schemas" / name,
            Path(__file__).resolve().parents[2] / "share" / "trust-receipt" / "schemas" / name,
        ]
    )
    for candidate in candidates:
        if candidate.is_file():
            return load_json(candidate)
    raise ValueError(
        f"Schema {name} was not found. Set TRUST_RECEIPT_ROOT to the reference package root."
    )


def _validate_inputs(request: dict[str, Any], grant: dict[str, Any], evidence: dict[str, Any]) -> None:
    require_valid(request, _schema("action-request.schema.json"))
    require_valid(grant, _schema("authority-grant.schema.json"))
    require_valid(evidence, _schema("material-evidence.schema.json"))


def cmd_gate(args: argparse.Namespace) -> int:
    request, grant, evidence = load_json(args.request), load_json(args.grant), load_json(args.evidence)
    _validate_inputs(request, grant, evidence)
    decision = evaluate_gate(request, grant, evidence)
    output = json.dumps(decision.as_dict(), indent=2)
    if args.output:
        _write_text(args.output, output + "\n")
    else:
        print(output)
    return 0 if decision.allowed else 2


def cmd_receipt_create(args: argparse.Namespace) -> int:
    request, grant, evidence = load_json(args.request), load_json(args.grant), load_json(args.evidence)
    _validate_inputs(request, grant, evidence)
    receipt, decision = create_receipt(request, grant, evidence, created_at=args.created_at)
    require_valid(receipt, _schema("trust-receipt.schema.json"))
    _write_json(args.output, receipt)
    if args.human_output:
        _write_text(args.human_output, render_receipt(receipt))
    print(json.dumps({"receipt": args.output, "gate": decision.as_dict()}, indent=2))
    return 0


def cmd_receipt_verify(args: argparse.Namespace) -> int:
    receipt = load_json(args.receipt)
    require_valid(receipt, _schema("trust-receipt.schema.json"))
    verified = verify_digest(receipt)
    print(json.dumps({"receipt_id": receipt["receipt_id"], "verified": verified}, indent=2))
    return 0 if verified else 2


def cmd_receipt_render(args: argparse.Namespace) -> int:
    receipt = load_json(args.receipt)
    require_valid(receipt, _schema("trust-receipt.schema.json"))
    rendered = render_receipt(receipt)
    if args.output:
        _write_text(args.output, rendered)
    else:
        print(rendered, end="")
    return 0


def _case_results(case: dict[str, Any], profile: dict[str, Any]) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    evidence_available = case.get("evidence_available", {})
    for requirement in profile["requirements"]:
        requirement_id = requirement["id"]
        status = case["results"].get(requirement_id, case.get("default_result", "pass"))
        available = evidence_available.get(requirement_id, True)
        results.append(
            {
                "requirement_id": requirement_id,
                "result": status,
                "evidence_available": available,
                "evidence_references": [f"fixture:{case['case_id']}:{requirement_id}"] if available else [],
                "gaps": [] if status == "pass" else [f"Fixture declared {status}."],
            }
        )
    return results


def cmd_conformance_assess(args: argparse.Namespace) -> int:
    source, profile = load_json(args.assessment), load_json(args.profile)
    decision = assess_conformance(source["requirement_results"], source["consequence_class"], profile)
    result = {
        "assessment_id": source["assessment_id"],
        "profile_version": profile["profile_version"],
        "evaluated_at": _now(),
        **decision,
    }
    require_valid(result, _schema("conformance-assessment.schema.json"))
    if args.output:
        _write_json(args.output, result)
    else:
        print(json.dumps(result, indent=2))
    return 0 if result["overall_decision"] != "does_not_conform" else 2


def cmd_conformance_run(args: argparse.Namespace) -> int:
    fixture, profile = load_json(args.cases), load_json(args.profile)
    evaluations: list[dict[str, Any]] = []
    passed = 0
    for case in fixture["cases"]:
        decision = assess_conformance(_case_results(case, profile), case["consequence_class"], profile)
        actual = {
            "overall_decision": decision["overall_decision"],
            "execution_mode": decision["execution_mode"],
        }
        matched = actual == case["expected"]
        passed += int(matched)
        evaluations.append(
            {
                "case_id": case["case_id"],
                "title": case["title"],
                "matched": matched,
                "expected": deepcopy(case["expected"]),
                "actual": actual,
                "failed_requirements": decision["failed_requirements"],
                "partial_requirements": decision["partial_requirements"],
            }
        )
    report = {
        "report_version": "0.1",
        "profile_id": profile["profile_id"],
        "profile_version": profile["profile_version"],
        "generated_at": _now(),
        "summary": {"total": len(evaluations), "passed": passed, "failed": len(evaluations) - passed},
        "cases": evaluations,
    }
    _write_json(args.output, report)
    markdown_path = args.markdown_output or str(Path(args.output).with_suffix(".md"))
    _write_text(markdown_path, _render_conformance_report(report))
    print(json.dumps(report["summary"], indent=2))
    return 0 if passed == len(evaluations) else 1


def _render_conformance_report(report: dict[str, Any]) -> str:
    rows = [
        f"| {item['case_id']} | {item['title']} | {'PASS' if item['matched'] else 'FAIL'} | {item['actual']['overall_decision']} | {item['actual']['execution_mode']} |"
        for item in report["cases"]
    ]
    summary = report["summary"]
    return "\n".join(
        [
            "# Reference Conformance Evidence",
            "",
            f"Profile: `{report['profile_id']}` `{report['profile_version']}`",
            "",
            f"Result: **{summary['passed']} of {summary['total']} vectors matched**; {summary['failed']} failed.",
            "",
            "| Case | Purpose | Match | Decision | Execution mode |",
            "|---|---|---:|---|---|",
            *rows,
            "",
            "This report demonstrates the included reference logic against the included vectors. It is not third-party certification or external audit evidence.",
            "",
        ]
    )


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="trust-receipt")
    groups = parser.add_subparsers(dest="group", required=True)

    gate = groups.add_parser("gate", help="Evaluate a pre-execution authority and evidence gate")
    gate_sub = gate.add_subparsers(dest="command", required=True)
    gate_eval = gate_sub.add_parser("evaluate")
    _input_arguments(gate_eval)
    gate_eval.add_argument("--output")
    gate_eval.set_defaults(handler=cmd_gate)

    receipt = groups.add_parser("receipt", help="Create, verify, or render a receipt")
    receipt_sub = receipt.add_subparsers(dest="command", required=True)
    create = receipt_sub.add_parser("create")
    _input_arguments(create)
    create.add_argument("--output", required=True)
    create.add_argument("--human-output")
    create.add_argument("--created-at", help="Deterministic RFC 3339 creation time")
    create.set_defaults(handler=cmd_receipt_create)
    verify = receipt_sub.add_parser("verify")
    verify.add_argument("--receipt", required=True)
    verify.set_defaults(handler=cmd_receipt_verify)
    render = receipt_sub.add_parser("render")
    render.add_argument("--receipt", required=True)
    render.add_argument("--output")
    render.set_defaults(handler=cmd_receipt_render)

    conformance = groups.add_parser("conformance", help="Assess or run conformance vectors")
    conformance_sub = conformance.add_subparsers(dest="command", required=True)
    assess = conformance_sub.add_parser("assess")
    assess.add_argument("--assessment", required=True)
    assess.add_argument("--profile", required=True)
    assess.add_argument("--output")
    assess.set_defaults(handler=cmd_conformance_assess)
    run = conformance_sub.add_parser("run")
    run.add_argument("--cases", required=True)
    run.add_argument("--profile", required=True)
    run.add_argument("--output", required=True)
    run.add_argument("--markdown-output")
    run.set_defaults(handler=cmd_conformance_run)
    return parser


def _input_arguments(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--request", required=True)
    parser.add_argument("--grant", required=True)
    parser.add_argument("--evidence", required=True)


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return args.handler(args)
    except ValidationFailure as error:
        print(json.dumps({"error": "schema_validation_failed", "issues": [item.as_dict() for item in error.issues]}, indent=2), file=sys.stderr)
        return 3
    except (KeyError, ValueError, json.JSONDecodeError) as error:
        print(json.dumps({"error": "invalid_input", "message": str(error)}, indent=2), file=sys.stderr)
        return 3
