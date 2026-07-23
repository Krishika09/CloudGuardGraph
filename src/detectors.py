"""Run and merge local detectors."""

from __future__ import annotations

from collections import Counter

from .checkov_adapter import adapt_checkov_results
from .iam_detector import detect_iam_findings
from .loader import load_checkov_results, load_inventory


SEVERITY_ORDER = ["Critical", "High", "Medium", "Low"]


def collect_findings(inventory: dict | None = None, checkov_results: dict | None = None) -> list[dict]:
    inventory = inventory or load_inventory()
    checkov_results = checkov_results or load_checkov_results()
    return merge_findings(adapt_checkov_results(checkov_results), detect_iam_findings(inventory))


def merge_findings(*finding_groups: list[dict]) -> list[dict]:
    findings = [finding for group in finding_groups for finding in group]
    seen: set[tuple[str, str, str]] = set()
    deduped: list[dict] = []
    for finding in findings:
        key = (finding["source"], finding["resource_id"], finding["type"])
        if key in seen:
            continue
        seen.add(key)
        finding["id"] = f"F-{len(deduped) + 1:03d}"
        deduped.append(finding)
    return deduped


def severity_summary(findings: list[dict]) -> dict[str, int]:
    counts = Counter(finding["severity"] for finding in findings)
    return {severity: counts.get(severity, 0) for severity in SEVERITY_ORDER}


if __name__ == "__main__":
    all_findings = collect_findings()
    counts = severity_summary(all_findings)
    print(f"Total findings: {len(all_findings)}")
    for severity in SEVERITY_ORDER:
        print(f"{severity}: {counts[severity]}")
