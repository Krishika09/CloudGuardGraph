resource "aws_iam_role" "app_admin" {
  name = "${local.project}-${local.environment}-app-admin"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })

  tags = merge(local.common_tags, {
    Name = "role-app-admin"
  })
}

resource "aws_iam_policy" "app_admin_policy" {
  name        = "${local.project}-${local.environment}-app-admin-policy"
  description = "Intentionally over-permissive policy for attack graph demonstration"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "VulnerableAdminAccess"
        Effect   = "Allow"
        Action   = "*"
        Resource = "*"
      },
      {
        Sid    = "ReadProductionSecrets"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = "*"
      },
      {
        Sid    = "PrivilegeEscalation"
        Effect = "Allow"
        Action = [
          "iam:PassRole",
          "iam:AttachRolePolicy"
        ]
        Resource = "*"
      },
      {
        Sid    = "BroadS3Access"
        Effect = "Allow"
        Action = [
          "s3:*"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = "role-app-admin-policy"
  })
}

resource "aws_iam_role_policy_attachment" "app_admin_attach" {
  role       = aws_iam_role.app_admin.name
  policy_arn = aws_iam_policy.app_admin_policy.arn
}

resource "aws_iam_instance_profile" "app_admin" {
  name = "${local.project}-${local.environment}-app-admin-profile"
  role = aws_iam_role.app_admin.name

  tags = merge(local.common_tags, {
    Name = "profile-app-admin"
  })
}
