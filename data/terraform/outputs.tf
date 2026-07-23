output "public_app_instance_id" {
  description = "Public application EC2 instance."
  value       = aws_instance.public_app.id
}

output "app_admin_role_name" {
  description = "Application IAM role."
  value       = aws_iam_role.app_admin.name
}

output "customer_data_bucket" {
  description = "Customer data S3 bucket."
  value       = aws_s3_bucket.customer_data.bucket
}

output "audit_logs_bucket" {
  description = "Audit logs S3 bucket."
  value       = aws_s3_bucket.audit_logs.bucket
}

output "prod_database_identifier" {
  description = "Production database identifier."
  value       = aws_db_instance.prod.identifier
}

output "prod_db_secret_name" {
  description = "Production database secret."
  value       = aws_secretsmanager_secret.prod_db.name
}
