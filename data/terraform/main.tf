# Intentionally vulnerable Terraform lab for CloudGuardGraph static analysis.
# Do not deploy this sample in a real AWS account.

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

locals {
  project     = "cloudguardgraph"
  environment = var.environment

  common_tags = {
    Project     = local.project
    Environment = local.environment
    Owner       = "course-project"
    ManagedBy   = "terraform"
  }
}
