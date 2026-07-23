"""Explain attack paths in presentation-friendly language."""

from __future__ import annotations


def explain_path(path: dict, inventory: dict, findings: list[dict]) -> dict:
    assets = {asset["id"]: asset for asset in inventory.get("assets", [])}
    nodes = path["nodes"]
    explanation: list[str] = []
    permissions: list[str] = []
    fixes: list[str] = []

    if nodes and nodes[0] == "Internet":
        explanation.append(f"Internet can reach {nodes[1]}, creating the initial public entry point.")

    for source, target in zip(nodes, nodes[1:]):
        source_asset = assets.get(source, {})
        target_asset = assets.get(target, {})
        if source_asset.get("type") == "ec2" and target_asset.get("type") == "iam_role":
            explanation.append(f"{source} assumes {target}, allowing compute access to role permissions.")
            permissions.extend(source_asset.get("permissions", []))
        elif target_asset.get("type") == "secret":
            explanation.append(f"{source} can read {target}, exposing sensitive credentials.")
        elif source_asset.get("type") == "secret" and target_asset.get("type") == "database":
            explanation.append(f"{source} unlocks {target}, a sensitive database asset.")
        elif target_asset.get("type") == "s3_bucket":
            explanation.append(f"{source} can access {target}, a sensitive storage bucket.")

    for node in nodes:
        permissions.extend(assets.get(node, {}).get("permissions", []))

    for finding in findings:
        if finding["id"] in path.get("findings", []):
            fixes.append(finding["fix"])

    if not explanation:
        explanation.append("This path connects a public entry point to a sensitive asset.")

    return {**path, "explanation": explanation, "permissions": sorted(set(permissions)), "fixes": sorted(set(fixes))}


def explain_paths(paths: list[dict], inventory: dict, findings: list[dict]) -> list[dict]:
    return [explain_path(path, inventory, findings) for path in paths]


def explain_attack_paths(paths: list[dict], inventory: dict, findings: list[dict]) -> list[dict]:
    """Public pipeline wrapper for attack-path explanations."""
    return explain_paths(paths, inventory, findings)
