resource "aws_instance" "public_app" {
  ami                         = var.demo_ami_id
  instance_type               = "t3.micro"
  subnet_id                   = aws_subnet.public_a.id
  vpc_security_group_ids      = [aws_security_group.public_ssh.id]
  iam_instance_profile        = aws_iam_instance_profile.app_admin.name
  associate_public_ip_address = true

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "optional"
  }

  root_block_device {
    encrypted = false
  }

  tags = merge(local.common_tags, {
    Name = "ec2-public-app"
    Role = "public-web"
    Risk = "public-compute-with-admin-role"
  })
}

resource "aws_instance" "api_worker" {
  ami                    = var.demo_ami_id
  instance_type          = "t3.micro"
  subnet_id              = aws_subnet.public_b.id
  vpc_security_group_ids = [aws_security_group.web_tier.id]

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  root_block_device {
    encrypted = true
  }

  tags = merge(local.common_tags, {
    Name = "ec2-api-worker"
    Role = "api"
  })
}
