import json

import pytest

from src.checkov_runner import CheckovRunError, validate_checkov_json
from src.loader import load_json
from src.pipeline import run_pipeline


def test_loader_reports_invalid_json_with_file_context(tmp_path):
    bad_json = tmp_path / "bad.json"
    bad_json.write_text("", encoding="utf-8")

    with pytest.raises(ValueError, match="Invalid JSON"):
        load_json(bad_json)


def test_checkov_validator_rejects_empty_output(tmp_path):
    empty_output = tmp_path / "checkov.json"
    empty_output.write_text("", encoding="utf-8")

    with pytest.raises(CheckovRunError, match="did not produce JSON"):
        validate_checkov_json(empty_output)


def test_checkov_validator_accepts_failed_checks_contract(tmp_path):
    output = tmp_path / "checkov.json"
    output.write_text(
        json.dumps({"results": {"failed_checks": [{"check_id": "CKV_TEST"}]}, "summary": {}}),
        encoding="utf-8",
    )

    data = validate_checkov_json(output)

    assert data["results"]["failed_checks"][0]["check_id"] == "CKV_TEST"


def test_pipeline_can_invoke_checkov_runner_before_analysis(monkeypatch, tmp_path):
    checkov_path = tmp_path / "checkov.json"
    output_path = tmp_path / "analysis.json"
    report_path = tmp_path / "report.html"

    def fake_run_checkov(terraform_dir, output_path):
        checkov_path.write_text(
            json.dumps(
                {
                    "results": {
                        "failed_checks": [
                            {
                                "check_id": "CKV_AWS_260",
                                "check_name": "Ensure no security groups allow ingress from 0.0.0.0:0 to port 22",
                                "resource": "aws_security_group.public_ssh",
                            }
                        ]
                    },
                    "summary": {},
                }
            ),
            encoding="utf-8",
        )
        return json.loads(checkov_path.read_text(encoding="utf-8"))

    monkeypatch.setattr("src.pipeline.run_checkov", fake_run_checkov)

    analysis = run_pipeline(
        checkov_path=checkov_path,
        output_path=output_path,
        report_path=report_path,
        run_checkov_scan=True,
    )

    assert output_path.exists()
    assert analysis["summary"]["total_findings"] > 0
