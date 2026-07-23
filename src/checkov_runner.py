"""Run Checkov safely and write a validated JSON result file."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

from .loader import PROJECT_ROOT


DEFAULT_TERRAFORM_DIR = "data/terraform"
DEFAULT_OUTPUT_PATH = "outputs/checkov_results.json"


class CheckovRunError(RuntimeError):
    """Raised when Checkov cannot produce a valid local scan result."""


def _resolve(path: str | Path) -> Path:
    resolved = Path(path)
    if not resolved.is_absolute():
        resolved = PROJECT_ROOT / resolved
    return resolved


def validate_checkov_json(path: str | Path) -> dict:
    output_path = _resolve(path)
    if not output_path.exists() or output_path.stat().st_size == 0:
        raise CheckovRunError(f"Checkov did not produce JSON output: {output_path}")

    try:
        data = json.loads(output_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise CheckovRunError(f"Checkov output is not valid JSON: {output_path}") from exc

    if not isinstance(data, dict) or not isinstance(data.get("results"), dict):
        raise CheckovRunError("Checkov output must be a JSON object with a 'results' object")
    if not isinstance(data["results"].get("failed_checks", []), list):
        raise CheckovRunError("Checkov output 'results.failed_checks' must be a list")
    return data


def run_checkov(
    terraform_dir: str | Path = DEFAULT_TERRAFORM_DIR,
    output_path: str | Path = DEFAULT_OUTPUT_PATH,
) -> dict:
    """Run Checkov into a temp file, validate it, then atomically replace output."""
    terraform_path = _resolve(terraform_dir)
    final_path = _resolve(output_path)
    tmp_path = final_path.with_suffix(f"{final_path.suffix}.tmp")

    if not terraform_path.exists():
        raise CheckovRunError(f"Terraform directory not found: {terraform_path}")

    final_path.parent.mkdir(parents=True, exist_ok=True)
    command = [
        sys.executable,
        "-m",
        "checkov.main",
        "-d",
        str(terraform_path),
        "--framework",
        "terraform",
        "--output",
        "json",
        "--quiet",
    ]

    with tmp_path.open("w", encoding="utf-8") as output_file:
        result = subprocess.run(
            command,
            stdout=output_file,
            stderr=subprocess.PIPE,
            text=True,
            cwd=PROJECT_ROOT,
            check=False,
        )

    data = validate_checkov_json(tmp_path)
    failed_count = len(data.get("results", {}).get("failed_checks", []))

    if result.returncode not in {0, 1}:
        tmp_path.unlink(missing_ok=True)
        raise CheckovRunError(result.stderr.strip() or f"Checkov exited with status {result.returncode}")
    if failed_count == 0:
        tmp_path.unlink(missing_ok=True)
        raise CheckovRunError("Checkov completed but found no failed checks in the vulnerable Terraform lab")

    tmp_path.replace(final_path)
    return data


def main() -> None:
    parser = argparse.ArgumentParser(description="Run Checkov for the CloudGuardGraph Terraform lab.")
    parser.add_argument("--terraform-dir", default=DEFAULT_TERRAFORM_DIR)
    parser.add_argument("--output", default=DEFAULT_OUTPUT_PATH)
    args = parser.parse_args()

    data = run_checkov(terraform_dir=args.terraform_dir, output_path=args.output)
    failed = len(data.get("results", {}).get("failed_checks", []))
    print(f"Checkov scan complete: {failed} failed checks")
    print(f"Output written to {_resolve(args.output).relative_to(PROJECT_ROOT)}")


if __name__ == "__main__":
    main()
