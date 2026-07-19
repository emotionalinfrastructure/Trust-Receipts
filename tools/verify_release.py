"""Generate a machine-readable verification manifest for the candidate release."""

from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[1]


def digest(path: Path) -> str:
    return "sha256:" + hashlib.sha256(path.read_bytes()).hexdigest()


def verification_time() -> str:
    epoch = os.environ.get("SOURCE_DATE_EPOCH")
    moment = (
        datetime.fromtimestamp(int(epoch), tz=timezone.utc)
        if epoch is not None
        else datetime.now(timezone.utc)
    )
    return moment.isoformat(timespec="seconds").replace("+00:00", "Z")


def main() -> int:
    json_files = sorted(
        [*ROOT.glob("schemas/*.json"), *ROOT.glob("profiles/*.json"), *ROOT.glob("fixtures/*.json")]
    )
    json_status = []
    for path in json_files:
        try:
            json.loads(path.read_text(encoding="utf-8"))
            valid = True
            error = None
        except (OSError, json.JSONDecodeError) as exc:
            valid = False
            error = str(exc)
        json_status.append({"path": str(path.relative_to(ROOT)), "valid": valid, "error": error})

    test = subprocess.run(
        [sys.executable, "-m", "unittest", "discover", "-s", "tests", "-v"],
        cwd=ROOT,
        env={**__import__("os").environ, "PYTHONPATH": str(ROOT / "src")},
        capture_output=True,
        text=True,
        check=False,
    )
    test_output = (test.stdout + test.stderr).strip()
    test_count_match = re.search(r"Ran (\d+) tests?", test_output)
    test_count = int(test_count_match.group(1)) if test_count_match else None
    reproducible_test_output = "\n".join(
        re.sub(r"^(Ran \d+ tests?) in [0-9.]+s$", r"\1", line)
        for line in test_output.splitlines()
        if line.startswith("test_")
        or line.startswith("Ran ")
        or line in {"OK", "FAILED"}
    )
    node = shutil.which("node")
    browser = subprocess.run(
        [node, str(ROOT / "tools/verify_browser_parity.mjs")]
        if node
        else [sys.executable, "-c", "raise SystemExit('Node.js is required')"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    browser_output = (browser.stdout + browser.stderr).strip()
    try:
        browser_summary = json.loads(browser.stdout) if browser.returncode == 0 else None
    except json.JSONDecodeError:
        browser_summary = None
    report = json.loads((ROOT / "evidence/conformance-report.json").read_text(encoding="utf-8"))
    receipt = json.loads((ROOT / "evidence/example-receipt.json").read_text(encoding="utf-8"))
    sys.path.insert(0, str(ROOT / "src"))
    from trust_receipt.integrity import verify_digest

    artifacts = [
        ROOT / "CHANGELOG.md",
        ROOT / "README.md",
        ROOT / "SECURITY.md",
        ROOT / "browser/integrity.mjs",
        ROOT / "docs/THREAT_MODEL_v0.1.md",
        ROOT / "docs/Trust_Receipt_Technical_Specification_v0.1.1.md",
        ROOT / "docs/AI_Trust_Receipt_Technical_Specification_Candidate_v0.1.1.pdf",
        ROOT / "dist/trust_receipt_reference-0.1.1-py3-none-any.whl",
        ROOT / "evidence/conformance-report.json",
        ROOT / "evidence/example-receipt.json",
        ROOT / "fixtures/browser-digest-vectors.json",
    ]
    manifest = {
        "manifest_version": "0.1.1",
        "candidate_version": "0.1.1",
        "generated_at": verification_time(),
        "json_parse": {
            "checked": len(json_status),
            "passed": sum(item["valid"] for item in json_status),
            "files": json_status,
        },
        "unit_tests": {
            "passed": test.returncode == 0,
            "passed_count": test_count if test.returncode == 0 else None,
            "total": test_count,
            "return_code": test.returncode,
            "output": reproducible_test_output,
        },
        "browser_parity": {
            "passed": browser.returncode == 0,
            "return_code": browser.returncode,
            "summary": browser_summary,
            "output": browser_output,
        },
        "conformance_vectors": report["summary"],
        "example_receipt_integrity_verified": verify_digest(receipt),
        "artifact_digests": {
            str(path.relative_to(ROOT)): digest(path) for path in artifacts
        },
        "claim_boundary": "Reference implementation evidence only; not certification or external audit evidence.",
    }
    output = ROOT / "evidence/release-verification.json"
    output.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    success = (
        manifest["json_parse"]["checked"] == manifest["json_parse"]["passed"]
        and manifest["unit_tests"]["passed"]
        and manifest["browser_parity"]["passed"]
        and manifest["conformance_vectors"]["failed"] == 0
        and manifest["example_receipt_integrity_verified"]
    )
    print(json.dumps({"output": str(output), "passed": success}, indent=2))
    return 0 if success else 1


if __name__ == "__main__":
    raise SystemExit(main())
