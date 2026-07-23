resource "aws_secretsmanager_secret" "prod_db" {
  name                    = "${local.project}/${local.environment}/prod-db"
  recovery_window_in_days = 0

  tags = merge(local.common_tags, {
    Name        = "secret-prod-db"
    Sensitivity = "critical"
  })
}

resource "aws_secretsmanager_secret_version" "prod_db" {
  secret_id = aws_secretsmanager_secret.prod_db.id

  secret_string = jsonencode({
    username = aws_db_instance.prod.username
    password = var.demo_db_password
    host     = aws_db_instance.prod.address
    database = aws_db_instance.prod.db_name
  })
}
