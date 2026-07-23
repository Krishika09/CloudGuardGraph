# Network controls intentionally include public ingress findings for Checkov.

resource "aws_security_group" "public_ssh" {
  name        = "${local.project}-${local.environment}-public-ssh"
  description = "Intentionally vulnerable SSH security group for attack-path demo"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "VULNERABLE: SSH open to internet"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "sg-open-ssh"
    Risk = "public-ssh"
  })
}

resource "aws_security_group" "open_rdp" {
  name        = "${local.project}-${local.environment}-open-rdp"
  description = "Intentionally vulnerable RDP security group for comparison"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "VULNERABLE: RDP open to internet"
    from_port   = 3389
    to_port     = 3389
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "sg-open-rdp"
    Risk = "public-rdp"
  })
}

resource "aws_security_group" "web_tier" {
  name        = "${local.project}-${local.environment}-web-tier"
  description = "Internal web tier security group"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "HTTPS from public ALB"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.public_alb.id]
  }

  egress {
    description = "Allow application outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "sg-web"
  })
}

resource "aws_security_group" "private_worker" {
  name        = "${local.project}-${local.environment}-private-worker"
  description = "Private worker security group"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "Internal HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["10.20.0.0/16"]
  }

  egress {
    description = "Allow worker outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "sg-private"
  })
}
