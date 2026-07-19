"""Build and verify the deterministic AI Trust Receipt v0.1.1 package."""

from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import subprocess
import sys
import tempfile
import venv
import zipfile


ROOT = Path(__file__).resolve().parents[1]
VERSION = "0.1.1"
RELEASE_EPOCH = 1784419200  # 2026-07-19T00:00:00Z
RELEASE_TIME = "2026-07-19T00:00:00Z"
ZIP_TIME = (2026, 7, 19, 0, 0, 0)
PACKAGE_ROOT = f"AI_Trust_Receipt_Complete_Release_v{VERSION}"
WHEEL_NAME = f"trust_receipt_reference-{VERSION}-py3-none-any.whl"
SPEC_STEM = f"AI_Trust_Receipt_Technical_Specification_Candidate_v{VERSION}"

SOURCE_ROOT_FILES = (
    ".gitignore",
    "CHANGELOG.md",
    "CITATION.cff",
    "CODE_OF_CONDUCT.md",
    "CONTRIBUTING.md",
    "GOVERNANCE.md",
    "LICENSE",
    "LICENSE-APACHE-2.0.txt",
    "LICENSE-CC-BY-4.0.txt",
    "NOTICE",
    "README.md",
    "ROADMAP.md",
    "SECURITY.md",
    "pyproject.toml",
)
SOURCE_DIRS = (
    ".github",
    "browser",
    "docs",
    "evidence",
    "fixtures",
    "profiles",
    "schemas",
    "src",
    "tests",
    "tools",
)


def run(command: list[str], *, env: dict[str, str] | None = None) -> str:
    result = subprocess.run(
        command,
        cwd=ROOT,
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        detail = (result.stdout + result.stderr).strip()
        raise RuntimeError(f"Command failed ({' '.join(command)}):\n{detail}")
    return (result.stdout + result.stderr).strip()


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def build_environment() -> dict[str, str]:
    return {
        **os.environ,
        "PYTHONPATH": str(ROOT / "src"),
        "SOURCE_DATE_EPOCH": str(RELEASE_EPOCH),
        "PIP_CACHE_DIR": str(ROOT / "tmp" / "pip-cache"),
        "TZ": "UTC",
    }


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def zip_files(
    destination: Path,
    files: list[tuple[Path, PurePosixPath]],
    *,
    prefix: str | None = None,
) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(
        destination,
        "w",
        compression=zipfile.ZIP_DEFLATED,
        compresslevel=9,
    ) as archive:
        for source, relative in sorted(files, key=lambda item: item[1].as_posix()):
            name = PurePosixPath(prefix, relative) if prefix else relative
            info = zipfile.ZipInfo(name.as_posix(), ZIP_TIME)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            info.create_system = 3
            archive.writestr(info, source.read_bytes(), compresslevel=9)


def source_files() -> list[tuple[Path, PurePosixPath]]:
    paths = [ROOT / name for name in SOURCE_ROOT_FILES]
    for directory in SOURCE_DIRS:
        paths.extend(path for path in (ROOT / directory).rglob("*") if path.is_file())
    paths.append(ROOT / "dist" / WHEEL_NAME)
    filtered = [
        path
        for path in paths
        if "__pycache__" not in path.parts
        and not path.name.endswith((".pyc", ".pyo"))
        and ".egg-info" not in path.as_posix()
    ]
    return [(path, PurePosixPath(path.relative_to(ROOT).as_posix())) for path in filtered]


def build_derived_artifacts(work: Path, env: dict[str, str]) -> Path:
    pdf = ROOT / "docs" / f"{SPEC_STEM}.pdf"
    raw_pdf = work / f"{SPEC_STEM}.raw.pdf"
    run(
        [
            "pandoc",
            f"docs/Trust_Receipt_Technical_Specification_v{VERSION}.md",
            "--from=gfm",
            "--pdf-engine=xelatex",
            "--include-in-header=tools/pdf-header.tex",
            "--toc",
            "--variable=geometry:margin=0.8in",
            "--variable=fontsize:10pt",
            f"--output={raw_pdf}",
        ],
        env=env,
    )
    run(
        [
            "gs",
            "-dBATCH",
            "-dNOPAUSE",
            "-dSAFER",
            "-dDeterministicID=true",
            "-dCompatibilityLevel=1.5",
            "-sDEVICE=pdfwrite",
            f"-sOutputFile={pdf}",
            str(raw_pdf),
        ],
        env=env,
    )

    wheel_dir = work / "wheel"
    wheel_dir.mkdir()
    run(
        [
            sys.executable,
            "-m",
            "pip",
            "wheel",
            ".",
            "--no-deps",
            "--no-build-isolation",
            f"--wheel-dir={wheel_dir}",
        ],
        env=env,
    )
    built_wheel = wheel_dir / WHEEL_NAME
    if not built_wheel.is_file():
        raise RuntimeError(f"Expected wheel was not built: {built_wheel}")
    published_wheel = ROOT / "dist" / WHEEL_NAME
    shutil.copyfile(built_wheel, published_wheel)

    run(
        [
            sys.executable,
            "-m",
            "trust_receipt",
            "conformance",
            "run",
            "--cases",
            "fixtures/conformance-cases.json",
            "--profile",
            "profiles/conformance-profile.v0.1.json",
            "--output",
            "evidence/conformance-report.json",
        ],
        env=env,
    )
    run(
        [
            sys.executable,
            "-m",
            "trust_receipt",
            "receipt",
            "create",
            "--request",
            "fixtures/action-request.valid.json",
            "--grant",
            "fixtures/authority-grant.valid.json",
            "--evidence",
            "fixtures/material-evidence.valid.json",
            "--created-at",
            "2026-07-15T14:30:01Z",
            "--base-uri",
            "https://issuer.example",
            "--output",
            "evidence/example-receipt.json",
            "--human-output",
            "evidence/example-receipt.txt",
        ],
        env=env,
    )
    run([sys.executable, "tools/verify_release.py"], env=env)
    return published_wheel


def verify_wheel(wheel: Path, work: Path, env: dict[str, str]) -> None:
    environment = work / "wheel-check"
    venv.EnvBuilder(with_pip=True, clear=True).create(environment)
    executable = environment / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
    isolated_env = {**env, "PYTHONPATH": "", "TRUST_RECEIPT_ROOT": str(ROOT)}
    run(
        [
            str(executable),
            "-m",
            "pip",
            "install",
            "--no-index",
            "--no-deps",
            "--force-reinstall",
            str(wheel),
        ],
        env=isolated_env,
    )
    run(
        [
            str(executable),
            "-m",
            "trust_receipt",
            "receipt",
            "verify",
            "--receipt",
            str(ROOT / "evidence/example-receipt.json"),
        ],
        env=isolated_env,
    )


def copy(stage: Path, source: str, destination: str) -> None:
    target = stage / destination
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(ROOT / source, target)


def stage_package(stage: Path, source_zip: Path, wheel: Path) -> None:
    copy(stage, "release/PACKAGE_README.md", "00_READ_ME_FIRST.md")
    copy(stage, "workbook/AI_Trust_Receipt_Workbook_Candidate_v0.1_REVISED.pdf", "01_Workbook/AI_Trust_Receipt_Workbook_Candidate_v0.1_REVISED.pdf")
    copy(stage, "workbook/Trust_Receipt_Conformance_Protocol_Insert_v0.1.pdf", "01_Workbook/Trust_Receipt_Conformance_Protocol_Insert_v0.1.pdf")
    copy(stage, f"docs/{SPEC_STEM}.pdf", f"02_Technical_Specification/{SPEC_STEM}.pdf")
    copy(stage, f"docs/Trust_Receipt_Technical_Specification_v{VERSION}.md", f"02_Technical_Specification/Trust_Receipt_Technical_Specification_v{VERSION}.md")

    reference = stage / "03_Reference_Implementation"
    reference.mkdir()
    shutil.copyfile(source_zip, reference / f"trust-receipt-reference-v{VERSION}.zip")
    shutil.copyfile(wheel, reference / WHEEL_NAME)

    copy(stage, "profiles/conformance-profile.v0.1.json", "04_Machine_Readable/reference-conformance-profile.v0.1.json")
    for schema in sorted((ROOT / "schemas").glob("*.json")):
        copy(stage, str(schema.relative_to(ROOT)), f"04_Machine_Readable/schemas/{schema.name}")
    copy(stage, "browser/integrity.mjs", "04_Machine_Readable/browser/integrity.mjs")
    copy(stage, "browser/README.md", "04_Machine_Readable/browser/README.md")
    copy(stage, "fixtures/browser-digest-vectors.json", "04_Machine_Readable/browser/browser-digest-vectors.json")

    for name in (
        "conformance-report.json",
        "conformance-report.md",
        "example-receipt.json",
        "example-receipt.txt",
        "release-verification.json",
    ):
        copy(stage, f"evidence/{name}", f"05_Verification_Evidence/{name}")

    governance = {
        "CHANGELOG.md": "CHANGELOG.md",
        "CITATION.cff": "CITATION.cff",
        "CODE_OF_CONDUCT.md": "CODE_OF_CONDUCT.md",
        "CONTRIBUTING.md": "CONTRIBUTING.md",
        "GOVERNANCE.md": "GOVERNANCE.md",
        "LICENSE": "LICENSE.md",
        "LICENSE-APACHE-2.0.txt": "LICENSE-APACHE-2.0.txt",
        "LICENSE-CC-BY-4.0.txt": "LICENSE-CC-BY-4.0.txt",
        "NOTICE": "NOTICE",
        "ROADMAP.md": "ROADMAP.md",
        "SECURITY.md": "SECURITY.md",
        "docs/PUBLIC_CLAIMS.md": "PUBLIC_CLAIMS.md",
        "docs/THREAT_MODEL_v0.1.md": "THREAT_MODEL_v0.1.md",
        f"release/RELEASE_NOTES_v{VERSION}.md": f"RELEASE_NOTES_v{VERSION}.md",
    }
    for source, destination in governance.items():
        copy(stage, source, f"06_Release_Governance/{destination}")


def write_package_evidence(stage: Path, source_zip: Path, wheel: Path) -> None:
    payload = [
        path
        for path in stage.rglob("*")
        if path.is_file() and path.name not in {"release-manifest.json", "SHA256SUMS.txt"}
    ]
    verification = json.loads(
        (ROOT / "evidence/release-verification.json").read_text(encoding="utf-8")
    )
    manifest = {
        "release_id": f"ai-trust-receipt-complete-release-v{VERSION}",
        "status": "candidate-patch",
        "generated_at": RELEASE_TIME,
        "payload_artifact_count": len(payload),
        "verification": {
            "automated_python_tests": verification["unit_tests"],
            "browser_parity": verification["browser_parity"],
            "conformance_vectors": verification["conformance_vectors"],
            "example_receipt_integrity_verified": verification[
                "example_receipt_integrity_verified"
            ],
            "wheel_installation_verified": True,
            "source_archive_extraction_verified": True,
            "technical_spec_pdf_render_checked": True,
        },
        "claim_boundary": "Bundled candidate reference checks; not certification, external audit, issuer authentication, or regulator approval.",
        "artifacts": [
            {
                "path": path.relative_to(stage).as_posix(),
                "size_bytes": path.stat().st_size,
                "sha256": sha256(path),
            }
            for path in sorted(payload)
        ],
    }
    write_json(stage / "release-manifest.json", manifest)
    checksummed = [*payload, stage / "release-manifest.json"]
    lines = [
        f"{sha256(path)}  {path.relative_to(stage).as_posix()}"
        for path in sorted(checksummed)
    ]
    (stage / "SHA256SUMS.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")

    if zipfile.ZipFile(source_zip).testzip() is not None:
        raise RuntimeError("Source archive integrity check failed")
    if zipfile.ZipFile(wheel).testzip() is not None:
        raise RuntimeError("Wheel archive integrity check failed")


def publish_repository_ledgers(stage: Path, archive: Path, wheel: Path) -> None:
    shutil.copyfile(stage / "release-manifest.json", ROOT / "release/PACKAGE_MANIFEST.json")
    shutil.copyfile(stage / "SHA256SUMS.txt", ROOT / "release/PACKAGE_SHA256SUMS.txt")
    ledger_paths = [
        archive,
        ROOT / "release/PACKAGE_MANIFEST.json",
        ROOT / "release/PACKAGE_README.md",
        ROOT / "release/PACKAGE_SHA256SUMS.txt",
        ROOT / f"release/RELEASE_NOTES_v{VERSION}.md",
        ROOT / f"docs/{SPEC_STEM}.pdf",
        wheel,
    ]
    lines = [f"{sha256(path)}  {path.relative_to(ROOT).as_posix()}" for path in ledger_paths]
    (ROOT / "release/SHA256SUMS_REPOSITORY.txt").write_text(
        "\n".join(lines) + "\n", encoding="utf-8"
    )


def main() -> int:
    (ROOT / "tmp").mkdir(exist_ok=True)
    env = build_environment()
    with tempfile.TemporaryDirectory(prefix="release-v011-", dir=ROOT / "tmp") as temporary:
        work = Path(temporary)
        wheel = build_derived_artifacts(work, env)
        verify_wheel(wheel, work, env)

        pdf_check = work / "pdf-check"
        run(
            [
                "pdftoppm",
                "-f",
                "1",
                "-l",
                "1",
                "-png",
                str(ROOT / f"docs/{SPEC_STEM}.pdf"),
                str(pdf_check),
            ],
            env=env,
        )

        source_zip = work / f"trust-receipt-reference-v{VERSION}.zip"
        zip_files(source_zip, source_files())
        stage = work / PACKAGE_ROOT
        stage.mkdir()
        stage_package(stage, source_zip, wheel)
        write_package_evidence(stage, source_zip, wheel)

        archive = ROOT / "release" / f"{PACKAGE_ROOT}.zip"
        staged_files = [
            (path, PurePosixPath(path.relative_to(stage).as_posix()))
            for path in stage.rglob("*")
            if path.is_file()
        ]
        zip_files(archive, staged_files, prefix=PACKAGE_ROOT)
        if zipfile.ZipFile(archive).testzip() is not None:
            raise RuntimeError("Complete release archive integrity check failed")
        publish_repository_ledgers(stage, archive, wheel)

    print(
        json.dumps(
            {
                "release": str(archive.relative_to(ROOT)),
                "sha256": sha256(archive),
                "generated_at": datetime.fromtimestamp(
                    RELEASE_EPOCH, tz=timezone.utc
                ).isoformat().replace("+00:00", "Z"),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
