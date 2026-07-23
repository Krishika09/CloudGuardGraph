"""Load local CloudGuardGraph inputs."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[1]


def load_json(path: str | Path, default: Any | None = None) -> Any:
    file_path = Path(path)
    if not file_path.is_absolute():
        file_path = PROJECT_ROOT / file_path
    if not file_path.exists():
        if default is not None:
            return default
        raise FileNotFoundError(f"Required file not found: {file_path}")
    try:
        return json.loads(file_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON in {file_path}: {exc.msg}") from exc


def load_inventory(path: str | Path = "data/sample_inventory.json") -> dict:
    data = load_json(path, default={"assets": []})
    if not isinstance(data, dict) or "assets" not in data:
        raise ValueError("Inventory must be a JSON object with an 'assets' list")
    return data


def load_checkov_results(path: str | Path = "outputs/checkov_results.json") -> dict:
    return load_json(path, default={"results": {"failed_checks": []}, "summary": {}})
