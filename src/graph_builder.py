"""Build a directed cloud asset graph."""

from __future__ import annotations

import networkx as nx


def asset_map(inventory: dict) -> dict[str, dict]:
    return {asset["id"]: asset for asset in inventory.get("assets", [])}


def build_graph(inventory: dict) -> nx.DiGraph:
    graph = nx.DiGraph()
    assets = asset_map(inventory)

    graph.add_node("Internet", id="Internet", name="Internet", type="internet", criticality="high", public=True)
    for asset in assets.values():
        if asset.get("type") == "external" and asset.get("id", "").lower() == "internet":
            continue
        graph.add_node(asset["id"], **asset)

    for asset in assets.values():
        asset_id = asset["id"]
        asset_type = asset.get("type")

        if asset_type == "load_balancer" and asset.get("public"):
            graph.add_edge("Internet", asset_id, relation="PUBLIC_ACCESS")
            for target in asset.get("routes_to", []):
                if target in assets:
                    graph.add_edge(asset_id, target, relation="ROUTES_TO")

        if asset_type == "ec2":
            if asset.get("public"):
                graph.add_edge("Internet", asset_id, relation="PUBLIC_ACCESS")
            security_group = asset.get("security_group")
            if security_group in assets:
                graph.add_edge(asset_id, security_group, relation="PROTECTED_BY")
            role = asset.get("iam_role")
            if role in assets:
                graph.add_edge(asset_id, role, relation="ASSUMES_ROLE")

        if asset_type == "iam_role":
            for secret_id in asset.get("can_read_secrets", []):
                if secret_id in assets:
                    graph.add_edge(asset_id, secret_id, relation="CAN_READ_SECRET")
            for bucket_id in asset.get("can_access_buckets", []):
                if bucket_id in assets:
                    graph.add_edge(asset_id, bucket_id, relation="CAN_ACCESS_BUCKET")

        if asset_type == "secret":
            database_id = asset.get("unlocks")
            if database_id in assets:
                graph.add_edge(asset_id, database_id, relation="UNLOCKS_DATABASE")

        if asset_type == "s3_bucket" and asset.get("public"):
            graph.add_edge("Internet", asset_id, relation="PUBLIC_BUCKET")

    return graph


def serialize_graph(graph: nx.DiGraph) -> dict:
    """Convert a NetworkX graph into dashboard/report-safe JSON data."""
    nodes = [
        {
            "id": node_id,
            "label": data.get("name", node_id),
            "type": data.get("type", "unknown"),
            "criticality": data.get("criticality", "medium"),
            "public": bool(data.get("public", False)),
        }
        for node_id, data in graph.nodes(data=True)
    ]
    edges = [
        {
            "id": f"edge-{index:03d}",
            "source": source,
            "target": target,
            "relation": data.get("relation", "RELATED_TO"),
        }
        for index, (source, target, data) in enumerate(graph.edges(data=True), start=1)
    ]
    return {"nodes": nodes, "edges": edges}
