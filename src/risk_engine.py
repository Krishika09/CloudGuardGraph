"""Score attack paths and attach relevant findings."""

from __future__ import annotations


def severity_from_score(score: int) -> str:
    if score >= 80:
        return "Critical"
    if score >= 60:
        return "High"
    if score >= 40:
        return "Medium"
    return "Low"


def score_path(path: dict, inventory: dict, findings: list[dict]) -> dict:
    assets = {asset["id"]: asset for asset in inventory.get("assets", [])}
    nodes = path["nodes"]
    node_set = set(nodes)
    score = 0
    reasons: list[str] = []

    if nodes and nodes[0] == "Internet":
        score += 30
        reasons.append("internet reachable")

    for node in nodes:
        asset = assets.get(node, {})
        permissions = asset.get("permissions", [])
        if asset.get("type") == "iam_role" and ("*" in permissions or any("admin" in p.lower() for p in permissions)):
            score += 25
            reasons.append("wildcard/admin IAM")
            break

    target = assets.get(path["target"], {})
    if target.get("criticality") == "critical":
        score += 20
        reasons.append("critical target")

    if any(assets.get(node, {}).get("type") == "secret" for node in nodes):
        score += 15
        reasons.append("secret in path")

    relevant = [finding for finding in findings if finding["resource_id"] in node_set]
    if any(f["type"] == "Open ingress" for f in relevant):
        score += 10
        reasons.append("open security group")

    if any(
        assets.get(node, {}).get("type") == "s3_bucket"
        and assets.get(node, {}).get("public")
        and not assets.get(node, {}).get("encrypted", True)
        for node in nodes
    ):
        score += 10
        reasons.append("public unencrypted S3")

    score = min(score, 100)
    return {
        **path,
        "risk": score,
        "risk_score": score,
        "severity": severity_from_score(score),
        "findings": [finding["id"] for finding in relevant],
        "related_findings": [finding["id"] for finding in relevant],
        "risk_factors": reasons if reasons else ["low-risk path"],
        "why": ", ".join(reasons) if reasons else "low-risk path",
    }


def score_paths(paths: list[dict], inventory: dict, findings: list[dict]) -> list[dict]:
    return sorted((score_path(path, inventory, findings) for path in paths), key=lambda item: item["risk"], reverse=True)


def score_attack_paths(paths: list[dict], inventory: dict, findings: list[dict]) -> list[dict]:
    """Public pipeline wrapper for attack-path risk scoring."""
    return score_paths(paths, inventory, findings)
