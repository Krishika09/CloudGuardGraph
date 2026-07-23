"""Generate remediation recommendations from findings and attack paths."""

from __future__ import annotations


FIX_TYPE_BY_FINDING = {
    "Open ingress": "restrict_security_group",
    "Public bucket": "make_s3_private",
    "Missing encryption": "enable_s3_encryption",
    "Secret Access": "remove_secret_read_permission",
    "Admin/Wildcard Access": "reduce_iam_permissions",
    "Privilege Escalation": "remove_privilege_escalation_permission",
    "Broad S3 Access": "reduce_s3_permissions",
    "Over-permissive IAM": "reduce_iam_permissions",
}

TITLE_BY_FIX_TYPE = {
    "restrict_security_group": "Restrict public network exposure",
    "make_s3_private": "Make public S3 bucket private",
    "enable_s3_encryption": "Enable storage encryption",
    "remove_secret_read_permission": "Remove unnecessary secret read access",
    "reduce_iam_permissions": "Replace broad IAM permissions",
    "remove_privilege_escalation_permission": "Remove privilege escalation permissions",
    "reduce_s3_permissions": "Scope S3 permissions to required buckets",
}

IMPACT_BY_SEVERITY = {
    "Critical": 35,
    "High": 24,
    "Medium": 14,
    "Low": 6,
}

EFFORT_BY_FIX_TYPE = {
    "restrict_security_group": "low",
    "make_s3_private": "low",
    "enable_s3_encryption": "medium",
    "remove_secret_read_permission": "medium",
    "reduce_iam_permissions": "medium",
    "remove_privilege_escalation_permission": "medium",
    "reduce_s3_permissions": "medium",
}


def _path_ids_by_finding(attack_paths: list[dict]) -> dict[str, list[str]]:
    mapping: dict[str, list[str]] = {}
    for path in attack_paths:
        for finding_id in path.get("related_findings", path.get("findings", [])):
            mapping.setdefault(finding_id, []).append(path["id"])
    return mapping


def generate_recommendations(findings: list[dict], attack_paths: list[dict]) -> list[dict]:
    """Create deterministic remediation recommendations for dashboard/report use."""
    paths_by_finding = _path_ids_by_finding(attack_paths)
    recommendations = []

    for index, finding in enumerate(findings, start=1):
        fix_type = FIX_TYPE_BY_FINDING.get(finding["type"], "review_resource_configuration")
        title = TITLE_BY_FIX_TYPE.get(fix_type, f"Remediate {finding['type']}")
        severity = finding.get("severity", "Medium")
        attack_path_ids = paths_by_finding.get(finding["id"], [])
        path_bonus = min(len(attack_path_ids) * 4, 16)

        recommendations.append(
            {
                "id": f"R-{index:03d}",
                "finding_id": finding["id"],
                "resource_id": finding["resource_id"],
                "resource_type": finding["resource_type"],
                "title": title,
                "severity": severity,
                "fix_type": fix_type,
                "reason": finding["reason"],
                "fix": finding["fix"],
                "expected_impact": "Reduces graph-based risk for linked attack paths."
                if attack_path_ids
                else "Reduces standalone misconfiguration risk.",
                "estimated_risk_reduction": IMPACT_BY_SEVERITY.get(severity, 10) + path_bonus,
                "effort": EFFORT_BY_FIX_TYPE.get(fix_type, "medium"),
                "attack_path_ids": attack_path_ids,
                "status": "suggested",
            }
        )

    return sorted(
        recommendations,
        key=lambda item: (item["estimated_risk_reduction"], item["severity"]),
        reverse=True,
    )
