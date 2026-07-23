resource "aws_db_subnet_group" "public" {
  name       = "${local.project}-${local.environment}-db-subnets"
  subnet_ids = [aws_subnet.public_a.id, aws_subnet.public_b.id]

  tags = merge(local.common_tags, {
    Name = "${local.project}-${local.environment}-db-subnets"
  })
}

resource "aws_security_group" "database" {
  name        = "${local.project}-${local.environment}-database"
  description = "Database security group"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "PostgreSQL from public application server"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.public_ssh.id]
  }

  egress {
    description = "Allow database outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "sg-database"
  })
}

resource "aws_db_instance" "prod" {
  identifier             = "${local.project}-${local.environment}-prod"
  allocated_storage      = 20
  engine                 = "postgres"
  engine_version         = "15"
  instance_class         = "db.t3.micro"
  db_name                = "production"
  username               = "demo_admin"
  password               = var.demo_db_password
  db_subnet_group_name   = aws_db_subnet_group.public.name
  vpc_security_group_ids = [aws_security_group.database.id]
  publicly_accessible    = true
  storage_encrypted      = false
  skip_final_snapshot    = true
  deletion_protection    = false

  tags = merge(local.common_tags, {
    Name        = "db-prod"
    Sensitivity = "critical"
    Risk        = "public-unencrypted-database"
  })
}
