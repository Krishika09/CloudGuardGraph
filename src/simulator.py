"""Remediation impact simulator."""

from __future__ import annotations

from copy import deepcopy

from .attack_paths import find_attack_paths
from .detectors import collect_findings
from .explainability import explain_paths
from .graph_builder import build_graph
from .risk_engine import score_paths


def apply_fix(inventory: dict, fix_type: str) -> dict:
    updated = deepcopy(inventory)
    normalized_fix = {
        "reduce_iam_permissions": "remove_secret_read_permission",
        "remove_privilege_escalation_permission": "remove_secret_read_permission",
        "reduce_s3_permissions": "make_s3_private",
    }.get(fix_type, fix_type)
    for asset in updated.get("assets", []):
        if normalized_fix == "make_s3_private" and asset.get("type") == "s3_bucket":
            asset["public"] = False
        elif normalized_fix == "enable_s3_encryption" and asset.get("type") == "s3_bucket":
            asset["encrypted"] = True
        elif normalized_fix == "restrict_security_group" and asset.get("type") == "security_group":
            asset["ingress"] = [rule for rule in asset.get("ingress", []) if rule.get("cidr") != "0.0.0.0/0"]
        elif normalized_fix == "remove_secret_read_permission" and asset.get("type") == "iam_role":
            asset["permissions"] = [
                permission for permission in asset.get("permissions", [])
                if permission
                not in {
                    "*",
                    "iam:PassRole",
                    "iam:AttachRolePolicy",
                    "secretsmanager:GetSecretValue",
                }
            ]
            asset["can_read_secrets"] = []

    if normalized_fix == "restrict_security_group":
        open_sgs = {
            asset["id"]
            for asset in updated.get("assets", [])
            if asset.get("type") == "security_group" and any(rule.get("cidr") == "0.0.0.0/0" for rule in asset.get("ingress", []))
        }
        for asset in updated.get("assets", []):
            if asset.get("type") == "ec2" and asset.get("security_group") not in open_sgs:
                asset["public"] = False
    return updated


def _calculate(inventory: dict) -> list[dict]:
    findings = collect_findings(inventory)
    graph = build_graph(inventory)
    paths = find_attack_paths(graph, inventory)
    return explain_paths(score_paths(paths, inventory, findings), inventory, findings)


def simulate_remediation(inventory: dict, fix_type: str) -> dict:
    before_paths = _calculate(inventory)
    updated = apply_fix(inventory, fix_type)
    after_paths = _calculate(updated)
    before_risk = max((path["risk"] for path in before_paths), default=0)
    after_risk = max((path["risk"] for path in after_paths), default=0)
    before_ids = {tuple(path["nodes"]) for path in before_paths}
    after_ids = {tuple(path["nodes"]) for path in after_paths}
    removed = before_ids - after_ids
    return {
        "before_risk": before_risk,
        "after_risk": after_risk,
        "risk_reduction_percent": round(((before_risk - after_risk) / before_risk) * 100, 1) if before_risk else 0,
        "removed_paths": len(removed),
        "remaining_paths": len(after_paths),
        "before_paths": before_paths,
        "after_paths": after_paths,
    }
