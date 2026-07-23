from src.attack_paths import find_attack_paths
from src.detectors import collect_findings
from src.graph_builder import build_graph
from src.loader import load_inventory
from src.risk_engine import score_paths
from src.simulator import simulate_remediation


def test_iam_wildcard_is_detected():
    findings = collect_findings(load_inventory())
    assert any(f["resource_id"] == "role-app-admin" and f["type"] == "Admin/Wildcard Access" for f in findings)


def test_public_s3_is_detected():
    findings = collect_findings(load_inventory())
    assert any(f["resource_id"] == "s3-customer-data" and f["type"] == "Public bucket" for f in findings)


def test_graph_contains_internet_to_ec2_path():
    graph = build_graph(load_inventory())
    assert graph.has_edge("Internet", "ec2-public-app")


def test_attack_path_to_db_is_found():
    inventory = load_inventory()
    graph = build_graph(inventory)
    paths = find_attack_paths(graph, inventory)
    assert any(path["target"] == "db-prod" for path in paths)


def test_risk_decreases_after_remediation():
    result = simulate_remediation(load_inventory(), "remove_secret_read_permission")
    assert result["after_risk"] < result["before_risk"]

