variable "aws_region" {
  description = "AWS region used by the sample vulnerable environment."
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment label for the sample stack."
  type        = string
  default     = "production"
}

variable "trusted_admin_cidr" {
  description = "Trusted admin network. Intentionally not used by the vulnerable SSH/RDP rules."
  type        = string
  default     = "203.0.113.10/32"
}

variable "demo_ami_id" {
  description = "Demo AMI ID used for static IaC scanning only."
  type        = string
  default     = "ami-1234567890abcdef0"
}

variable "demo_db_password" {
  description = "Demo database password for vulnerable IaC scanning only."
  type        = string
  default     = "DoNotUseThisPassword123!"
  sensitive   = true
}
