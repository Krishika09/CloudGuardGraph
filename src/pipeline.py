"""CloudGuardGraph analysis pipeline.

This module is the single orchestration point for the local MVP. It converts
Terraform scanner output and synthetic inventory into a persisted analysis file
that the API, dashboard, simulator, and report generator can consume.
"""

from __future__ import annotations

import json
import argparse
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from .attack_paths import find_attack_paths
from .checkov_adapter import normalize_checkov_findings
from .checkov_runner import DEFAULT_TERRAFORM_DIR, run_checkov
from .detectors import merge_findings
from .explainability import explain_attack_paths
from .graph_builder import build_graph, serialize_graph
from .iam_detector import detect_iam_findings
from .loader import PROJECT_ROOT, load_checkov_results, load_inventory
from .recommendations import generate_recommendations
from .report import build_report, save_report
from .risk_engine import score_attack_paths


DEFAULT_INVENTORY_PATH = "data/sample_inventory.json"
DEFAULT_CHECKOV_PATH = "outputs/checkov_results.json"
DEFAULT_ANALYSIS_PATH = "outputs/analysis.json"
DEFAULT_REPORT_PATH = "reports/report.html"

SEVERITIES = ("Critical", "High", "Medium", "Low")


def _resolve(path: str | Path) -> Path:
    resolved = Path(path)
    if not resolved.is_absolute():
        resolved = PROJECT_ROOT / resolved
    return resolved


def _utc_now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _severity_counts(findings: list[dict]) -> dict[str, int]:
    counts = Counter(finding.get("severity", "Medium") for finding in findings)
    return {severity: counts.get(severity, 0) for severity in SEVERITIES}


def _summary(assets: list[dict], findings: list[dict], attack_paths: list[dict], graph: dict) -> dict:
    severity_counts = _severity_counts(findings)
    risks = [path.get("risk_score", path.get("risk", 0)) for path in attack_paths]
    return {
        "total_assets": len(assets),
        "total_findings": len(findings),
        "critical_findings": severity_counts["Critical"],
        "high_findings": severity_counts["High"],
        "medium_findings": severity_counts["Medium"],
        "low_findings": severity_counts["Low"],
        "graph_nodes": len(graph["nodes"]),
        "graph_edges": len(graph["edges"]),
        "attack_paths": len(attack_paths),
        "average_risk": round(sum(risks) / len(risks), 1) if risks else 0,
        "max_risk": max(risks, default=0),
    }


def _risky_resources(findings: list[dict], attack_paths: list[dict]) -> list[dict]:
    severity_weight = {"Critical": 4, "High": 3, "Medium": 2, "Low": 1}
    path_hits = Counter(
        node
        for path in attack_paths
        for node in path.get("nodes", [])
        if node != "Internet"
    )
    grouped: dict[str, dict[str, Any]] = {}

    for finding in findings:
        resource_id = finding["resource_id"]
        entry = grouped.setdefault(
            resource_id,
            {
                "resource_id": resource_id,
                "resource_type": finding["resource_type"],
                "finding_count": 0,
                "attack_path_count": 0,
                "risk_weight": 0,
            },
        )
        entry["finding_count"] += 1
        entry["risk_weight"] += severity_weight.get(finding.get("severity", "Medium"), 2)

    for resource_id, count in path_hits.items():
        entry = grouped.setdefault(
            resource_id,
            {
                "resource_id": resource_id,
                "resource_type": "unknown",
                "finding_count": 0,
                "attack_path_count": 0,
                "risk_weight": 0,
            },
        )
        entry["attack_path_count"] = count
        entry["risk_weight"] += count * 2

    return sorted(grouped.values(), key=lambda item: item["risk_weight"], reverse=True)


def _write_json(path: str | Path, payload: dict) -> Path:
    output_path = _resolve(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return output_path


def build_analysis(
    inventory_path: str | Path = DEFAULT_INVENTORY_PATH,
    checkov_path: str | Path = DEFAULT_CHECKOV_PATH,
) -> dict:
    """Run all analysis stages and return the in-memory result."""
    inventory = load_inventory(inventory_path)
    checkov_results = load_checkov_results(checkov_path)

    checkov_findings = normalize_checkov_findings(checkov_results)
    iam_findings = detect_iam_findings(inventory)
    findings = merge_findings(checkov_findings, iam_findings)

    graph_object = build_graph(inventory)
    graph = serialize_graph(graph_object)
    raw_paths = find_attack_paths(graph_object, inventory, cutoff=6)
    scored_paths = score_attack_paths(raw_paths, inventory, findings)
    attack_paths = explain_attack_paths(scored_paths, inventory, findings)
    recommendations = generate_recommendations(findings, attack_paths)
    assets = inventory.get("assets", [])
    risky_resources = _risky_resources(findings, attack_paths)
    severity_counts = _severity_counts(findings)
    summary = _summary(assets, findings, attack_paths, graph)

    return {
        "metadata": {
            "project": "CloudGuardGraph",
            "generated_at": _utc_now(),
            "inventory_source": str(inventory_path),
            "checkov_source": str(checkov_path),
            "pipeline_version": "phase-1",
        },
        "summary": summary,
        "severity_counts": severity_counts,
        "assets": assets,
        "findings": findings,
        "graph": graph,
        "attack_paths": attack_paths,
        "recommendations": recommendations,
        "risky_resources": risky_resources,
        "inputs": {
            "inventory": inventory,
            "checkov_summary": checkov_results.get("summary", {}),
        },
    }


def run_pipeline(
    inventory_path: str | Path = DEFAULT_INVENTORY_PATH,
    checkov_path: str | Path = DEFAULT_CHECKOV_PATH,
    output_path: str | Path = DEFAULT_ANALYSIS_PATH,
    report_path: str | Path = DEFAULT_REPORT_PATH,
    run_checkov_scan: bool = False,
    terraform_dir: str | Path = DEFAULT_TERRAFORM_DIR,
) -> dict:
    """Run analysis, persist JSON, refresh the HTML report, and print a summary."""
    if run_checkov_scan:
        scan_result = run_checkov(terraform_dir=terraform_dir, output_path=checkov_path)
        failed_count = len(scan_result.get("results", {}).get("failed_checks", []))
        print(f"Checkov scan complete: {failed_count} failed checks")

    analysis = build_analysis(inventory_path=inventory_path, checkov_path=checkov_path)
    analysis_path = _write_json(output_path, analysis)

    html = build_report(
        analysis["summary"],
        analysis["severity_counts"],
        analysis["attack_paths"][:10],
        analysis["risky_resources"][:10],
    )
    save_report(html, _resolve(report_path))

    summary = analysis["summary"]
    try:
        display_path = analysis_path.relative_to(PROJECT_ROOT)
    except ValueError:
        display_path = analysis_path
    print("Analysis complete")
    print(f"Assets: {summary['total_assets']}")
    print(f"Findings: {summary['total_findings']}")
    print(f"Graph nodes: {summary['graph_nodes']}")
    print(f"Graph edges: {summary['graph_edges']}")
    print(f"Attack paths: {summary['attack_paths']}")
    print(f"Output written to {display_path}")
    return analysis


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the CloudGuardGraph analysis pipeline.")
    parser.add_argument("--inventory", default=DEFAULT_INVENTORY_PATH)
    parser.add_argument("--checkov", default=DEFAULT_CHECKOV_PATH)
    parser.add_argument("--output", default=DEFAULT_ANALYSIS_PATH)
    parser.add_argument("--report", default=DEFAULT_REPORT_PATH)
    parser.add_argument("--terraform-dir", default=DEFAULT_TERRAFORM_DIR)
    parser.add_argument("--run-checkov", action="store_true", help="Regenerate Checkov JSON before analysis.")
    args = parser.parse_args()

    run_pipeline(
        inventory_path=args.inventory,
        checkov_path=args.checkov,
        output_path=args.output,
        report_path=args.report,
        run_checkov_scan=args.run_checkov,
        terraform_dir=args.terraform_dir,
    )


if __name__ == "__main__":
    main()
