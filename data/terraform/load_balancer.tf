resource "aws_security_group" "public_alb" {
  name        = "${local.project}-${local.environment}-public-alb"
  description = "Public ALB security group"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "VULNERABLE: HTTP open to internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow ALB outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "sg-public-alb"
  })
}

resource "aws_lb" "public_web" {
  name               = "${local.project}-${local.environment}-web"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.public_alb.id]
  subnets            = [aws_subnet.public_a.id, aws_subnet.public_b.id]

  enable_deletion_protection = false
  drop_invalid_header_fields = false

  tags = merge(local.common_tags, {
    Name = "lb-public-web"
    Risk = "public-entry-point"
  })
}

resource "aws_lb_target_group" "public_app" {
  name     = "${local.project}-${local.environment}-app"
  port     = 80
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    enabled = true
    path    = "/health"
  }

  tags = merge(local.common_tags, {
    Name = "${local.project}-${local.environment}-app-tg"
  })
}

resource "aws_lb_target_group_attachment" "public_app" {
  target_group_arn = aws_lb_target_group.public_app.arn
  target_id        = aws_instance.public_app.id
  port             = 80
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.public_web.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.public_app.arn
  }
}
