resource "aws_s3_bucket" "customer_data" {
  bucket = "${local.project}-${local.environment}-customer-data-demo"

  tags = merge(local.common_tags, {
    Name        = "s3-customer-data"
    Sensitivity = "critical"
    Risk        = "public-sensitive-data"
  })
}

resource "aws_s3_bucket_public_access_block" "customer_data" {
  bucket = aws_s3_bucket.customer_data.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "customer_data_public" {
  bucket = aws_s3_bucket.customer_data.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "PublicReadCustomerData"
      Effect    = "Allow"
      Principal = "*"
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.customer_data.arn}/*"
    }]
  })

  depends_on = [aws_s3_bucket_public_access_block.customer_data]
}

resource "aws_s3_bucket" "audit_logs" {
  bucket = "${local.project}-${local.environment}-audit-logs-demo"

  tags = merge(local.common_tags, {
    Name        = "s3-audit-logs"
    Sensitivity = "high"
    Risk        = "unencrypted-logs"
  })
}

resource "aws_s3_bucket_versioning" "audit_logs" {
  bucket = aws_s3_bucket.audit_logs.id

  versioning_configuration {
    status = "Disabled"
  }
}

resource "aws_s3_bucket" "app_logs" {
  bucket = "${local.project}-${local.environment}-app-logs-demo"

  tags = merge(local.common_tags, {
    Name        = "s3-app-logs"
    Sensitivity = "medium"
  })
}

resource "aws_s3_bucket_server_side_encryption_configuration" "app_logs" {
  bucket = aws_s3_bucket.app_logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
