import json
from pathlib import Path

from src.checkov_adapter import adapt_checkov_results


PROJECT_ROOT = Path(__file__).resolve().parents[1]
TERRAFORM_DIR = PROJECT_ROOT / "data" / "terraform"
CHECKOV_RESULTS = PROJECT_ROOT / "outputs" / "checkov_results.json"


def test_phase2_terraform_files_exist():
    expected_files = {
        "main.tf",
        "variables.tf",
        "network.tf",
        "security_groups.tf",
        "iam.tf",
        "ec2.tf",
        "s3.tf",
        "rds.tf",
        "secrets.tf",
        "load_balancer.tf",
        "outputs.tf",
    }

    actual_files = {path.name for path in TERRAFORM_DIR.glob("*.tf")}

    assert expected_files <= actual_files


def test_phase2_terraform_contains_required_vulnerable_resources():
    terraform = "\n".join(path.read_text(encoding="utf-8") for path in TERRAFORM_DIR.glob("*.tf"))

    required_snippets = [
        'cidr_blocks = ["0.0.0.0/0"]',
        'Action   = "*"',
        'Resource = "*"',
        '"secretsmanager:GetSecretValue"',
        '"iam:PassRole"',
        '"s3:*"',
        'publicly_accessible    = true',
        'storage_encrypted      = false',
        'associate_public_ip_address = true',
        'aws_lb_listener" "http"',
    ]

    for snippet in required_snippets:
        assert snippet in terraform


def test_checkov_results_have_real_failed_checks():
    results = json.loads(CHECKOV_RESULTS.read_text(encoding="utf-8"))
    failed_checks = results.get("results", {}).get("failed_checks", [])
    failed_resources = {check.get("resource") for check in failed_checks}

    assert len(failed_checks) >= 20
    assert "aws_security_group.public_ssh" in failed_resources
    assert "aws_iam_policy.app_admin_policy" in failed_resources
    assert "aws_s3_bucket.customer_data" in failed_resources
    assert "aws_db_instance.prod" in failed_resources
    assert "aws_lb.public_web" in failed_resources


def test_checkov_adapter_maps_new_terraform_resources_to_graph_assets():
    results = json.loads(CHECKOV_RESULTS.read_text(encoding="utf-8"))
    findings = adapt_checkov_results(results)
    mapped_resource_ids = {finding["resource_id"] for finding in findings}

    assert "sg-open-ssh" in mapped_resource_ids
    assert "role-app-admin" in mapped_resource_ids
    assert "s3-customer-data" in mapped_resource_ids
    assert "db-prod" in mapped_resource_ids
    assert "lb-public-web" in mapped_resource_ids
