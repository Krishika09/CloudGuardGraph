"""Find attack paths from public entry points to sensitive assets."""

from __future__ import annotations

import networkx as nx


def target_assets(inventory: dict) -> list[str]:
    targets = []
    for asset in inventory.get("assets", []):
        if asset.get("type") in {"database", "secret"} and asset.get("criticality") in {"critical", "high"}:
            targets.append(asset["id"])
        elif asset.get("type") == "s3_bucket" and asset.get("sensitive"):
            targets.append(asset["id"])
    return targets


def find_attack_paths(graph: nx.DiGraph, inventory: dict, cutoff: int = 6) -> list[dict]:
    paths: list[dict] = []
    for target in target_assets(inventory):
        if target not in graph:
            continue
        for nodes in nx.all_simple_paths(graph, source="Internet", target=target, cutoff=cutoff):
            if len(nodes) < 2:
                continue
            paths.append({"id": f"P-{len(paths) + 1:03d}", "nodes": nodes, "target": target})
    return paths

