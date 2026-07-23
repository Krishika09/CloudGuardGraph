"""Normalize Checkov JSON into CloudGuardGraph findings."""

from __future__ import annotations

from typing import Any


CHECKOV_TYPE_MAP = {
    "aws_instance": "ec2",
    "aws_lb": "load_balancer",
    "aws_subnet": "subnet",
    "aws_vpc": "vpc",
    "aws_security_group": "security_group",
    "aws_s3_bucket": "s3_bucket",
    "aws_s3_bucket_policy": "s3_bucket",
    "aws_s3_bucket_public_access_block": "s3_bucket",
    "aws_s3_bucket_versioning": "s3_bucket",
    "aws_db_instance": "database",
    "aws_iam_policy": "iam_policy",
    "aws_iam_role": "iam_role",
    "aws_iam_instance_profile": "iam_role",
    "aws_secretsmanager_secret": "secret",
}

RESOURCE_ID_MAP = {
    "aws_security_group.sg_open_ssh": "sg-open-ssh",
    "aws_security_group.sg_open_rdp": "sg-open-rdp",
    "aws_security_group.public_ssh": "sg-open-ssh",
    "aws_security_group.open_rdp": "sg-open-rdp",
    "aws_security_group.web_tier": "sg-web",
    "aws_security_group.private_worker": "sg-private",
    "aws_security_group.public_alb": "lb-public-web",
    "aws_security_group.database": "db-prod",
    "aws_instance.public_app": "ec2-public-app",
    "aws_instance.api_worker": "ec2-api-worker",
    "aws_lb.public_web": "lb-public-web",
    "aws_s3_bucket.s3_customer_data": "s3-customer-data",
    "aws_s3_bucket.s3_audit_logs": "s3-audit-logs",
    "aws_s3_bucket.customer_data": "s3-customer-data",
    "aws_s3_bucket.audit_logs": "s3-audit-logs",
    "aws_s3_bucket.app_logs": "s3-app-logs",
    "aws_s3_bucket_policy.customer_data_public": "s3-customer-data",
    "aws_s3_bucket_public_access_block.customer_data": "s3-customer-data",
    "aws_s3_bucket_versioning.audit_logs": "s3-audit-logs",
    "aws_db_instance.db_prod": "db-prod",
    "aws_db_instance.prod": "db-prod",
    "aws_iam_policy.app_admin": "role-app-admin",
    "aws_iam_policy.app_admin_policy": "role-app-admin",
    "aws_iam_role.app_admin": "role-app-admin",
    "aws_iam_instance_profile.app_admin": "role-app-admin",
    "aws_secretsmanager_secret.prod_db": "secret-prod-db",
}


def _severity(check_id: str, check_name: str) -> str:
    text = f"{check_id} {check_name}".lower()
    if "0.0.0.0" in text or "public" in text or "wildcard" in text or "permissions management" in text:
        return "Critical"
    if "encrypted" in text or "encryption" in text:
        return "High"
    return "Medium"


def _terraform_resource_type(resource: str) -> str:
    return resource.split(".", 1)[0] if "." in resource else resource


def _finding_type(check_name: str) -> str:
    text = check_name.lower()
    if "security group" in text or "ingress" in text:
        return "Open ingress"
    if ("public" in text and "s3" in text) or "any principal" in text:
        return "Public bucket"
    if "encrypt" in text:
        return "Missing encryption"
    if "iam" in text or "permission" in text:
        return "Over-permissive IAM"
    return "Misconfiguration"


def _reason_and_fix(finding_type: str) -> tuple[str, str]:
    if finding_type == "Open ingress":
        return "Network control allows public inbound access.", "Restrict ingress to trusted CIDR ranges or private entry points."
    if finding_type == "Public bucket":
        return "S3 bucket allows public access.", "Enable S3 Block Public Access and remove public ACLs or bucket policies."
    if finding_type == "Missing encryption":
        return "Sensitive storage does not enforce encryption at rest.", "Enable default encryption with a managed KMS key."
    if finding_type == "Over-permissive IAM":
        return "IAM policy allows broad permissions without resource constraints.", "Replace broad IAM permissions with least-privilege statements."
    return "Scanner detected a cloud misconfiguration.", "Review the IaC resource and apply the scanner recommendation."


def adapt_checkov_results(results: dict[str, Any]) -> list[dict]:
    failed_checks = results.get("results", {}).get("failed_checks", [])
    findings: list[dict] = []
    for index, check in enumerate(failed_checks, start=1):
        resource = check.get("resource", "unknown")
        check_name = check.get("check_name", "Checkov failed check")
        check_id = check.get("check_id", f"CKV-{index}")
        terraform_type = check.get("resource_type") or _terraform_resource_type(resource)
        resource_type = CHECKOV_TYPE_MAP.get(terraform_type, terraform_type or "unknown")
        finding_type = _finding_type(check_name)
        reason, fix = _reason_and_fix(finding_type)
        findings.append(
            {
                "id": f"CKV-{index:03d}",
                "source": "checkov",
                "resource_id": RESOURCE_ID_MAP.get(resource, resource),
                "resource_type": resource_type,
                "type": finding_type,
                "severity": _severity(check_id, check_name),
                "reason": reason,
                "fix": fix,
                "check_id": check_id,
                "check_name": check_name,
            }
        )
    return findings


def normalize_checkov_findings(results: dict[str, Any]) -> list[dict]:
    """Public pipeline wrapper for Checkov finding normalization."""
    return adapt_checkov_results(results)
