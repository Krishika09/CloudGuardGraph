"""Simple rule-based IAM detector."""

from __future__ import annotations


RULES = [
    ("*", "Admin/Wildcard Access", "Critical", "Wildcard IAM action grants broad control.", "Replace '*' with least-privilege actions."),
    ("iam:PassRole", "Privilege Escalation", "Critical", "Role can pass IAM roles to services.", "Scope iam:PassRole to approved role ARNs and conditions."),
    ("iam:AttachRolePolicy", "Privilege Escalation", "Critical", "Role can attach policies to roles.", "Remove policy attachment rights from workload roles."),
    ("secretsmanager:GetSecretValue", "Secret Access", "High", "Role can read Secrets Manager values.", "Restrict secret reads to required secret ARNs."),
    ("s3:*", "Broad S3 Access", "Medium", "Role has broad S3 permissions.", "Limit S3 permissions to specific actions and buckets."),
]


def detect_iam_findings(inventory: dict) -> list[dict]:
    findings: list[dict] = []
    counter = 1
    for asset in inventory.get("assets", []):
        if asset.get("type") != "iam_role":
            continue
        permissions = asset.get("permissions", [])
        for permission in permissions:
            for needle, finding_type, severity, reason, fix in RULES:
                if permission == needle or needle.lower() in str(permission).lower():
                    findings.append(
                        {
                            "id": f"IAM-{counter:03d}",
                            "source": "iam_detector",
                            "resource_id": asset["id"],
                            "resource_type": "iam_role",
                            "type": finding_type,
                            "severity": severity,
                            "reason": reason,
                            "fix": fix,
                            "permission": permission,
                        }
                    )
                    counter += 1
    return findings

