"""Generate a machine-readable verification manifest for the candidate release."""

from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[1]


def digest(path: Path) -> str:
    return "sha256:" + hashlib.sha256(path.read_bytes()).hexdigest()


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
    report = json.loads((ROOT / "evidence/conformance-report.json").read_text(encoding="utf-8"))
    receipt = json.loads((ROOT / "evidence/example-receipt.json").read_text(encoding="utf-8"))
    sys.path.insert(0, str(ROOT / "src"))
    from trust_receipt.integrity import verify_digest

    artifacts = [
        ROOT / "docs/Trust_Receipt_Technical_Specification_v0.1.md",
        ROOT / "dist/AI_Trust_Receipt_Technical_Specification_Candidate_v0.1.pdf",
        ROOT / "dist/trust_receipt_reference-0.1.0-py3-none-any.whl",
        ROOT / "evidence/conformance-report.json",
        ROOT / "evidence/example-receipt.json",
    ]
    manifest = {
        "manifest_version": "0.1",
        "candidate_version": "0.1.0",
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "json_parse": {
            "checked": len(json_status),
            "passed": sum(item["valid"] for item in json_status),
            "files": json_status,
        },
        "unit_tests": {
            "passed": test.returncode == 0,
            "return_code": test.returncode,
            "output": (test.stdout + test.stderr).strip(),
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
        and manifest["conformance_vectors"]["failed"] == 0
        and manifest["example_receipt_integrity_verified"]
    )
    print(json.dumps({"output": str(output), "passed": success}, indent=2))
    return 0 if success else 1


if __name__ == "__main__":
    raise SystemExit(main())
