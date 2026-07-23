import json

from src.pipeline import run_pipeline


def test_pipeline_writes_complete_analysis_json(tmp_path):
    output_path = tmp_path / "analysis.json"
    report_path = tmp_path / "report.html"

    analysis = run_pipeline(output_path=output_path, report_path=report_path)
    persisted = json.loads(output_path.read_text(encoding="utf-8"))

    assert persisted["metadata"]["project"] == "CloudGuardGraph"
    assert persisted["summary"]["total_assets"] > 0
    assert persisted["summary"]["total_findings"] > 0
    assert persisted["summary"]["graph_nodes"] > 0
    assert persisted["summary"]["graph_edges"] > 0
    assert persisted["summary"]["attack_paths"] > 0
    assert persisted["assets"]
    assert persisted["findings"]
    assert persisted["graph"]["nodes"]
    assert persisted["graph"]["edges"]
    assert persisted["attack_paths"]
    assert persisted["recommendations"]
    assert analysis["summary"] == persisted["summary"]
    assert report_path.exists()


def test_pipeline_attack_paths_have_risk_explanations_and_findings(tmp_path):
    analysis = run_pipeline(output_path=tmp_path / "analysis.json", report_path=tmp_path / "report.html")

    top_path = analysis["attack_paths"][0]

    assert top_path["risk_score"] >= 80
    assert top_path["severity"] == "Critical"
    assert top_path["target"]
    assert top_path["nodes"][0] == "Internet"
    assert top_path["risk_factors"]
    assert top_path["related_findings"]
    assert top_path["explanation"]
    assert top_path["fixes"]


def test_pipeline_recommendations_link_to_findings_and_paths(tmp_path):
    analysis = run_pipeline(output_path=tmp_path / "analysis.json", report_path=tmp_path / "report.html")

    finding_ids = {finding["id"] for finding in analysis["findings"]}
    path_ids = {path["id"] for path in analysis["attack_paths"]}

    assert all(rec["finding_id"] in finding_ids for rec in analysis["recommendations"])
    assert any(set(rec["attack_path_ids"]) & path_ids for rec in analysis["recommendations"])
    assert any(rec["fix_type"] == "restrict_security_group" for rec in analysis["recommendations"])
