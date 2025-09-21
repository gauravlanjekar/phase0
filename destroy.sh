#!/bin/bash

# Mission Admin AWS Cleanup Script

set -e

STACK_NAME="mission-admin-stack"
REGION="us-east-1"

echo "🗑️ Destroying Mission Admin AWS resources..."

# Delete CloudFormation stack
aws cloudformation delete-stack \
  --stack-name $STACK_NAME \
  --region $REGION

echo "⏳ Waiting for stack deletion to complete..."
aws cloudformation wait stack-delete-complete \
  --stack-name $STACK_NAME \
  --region $REGION

echo "✅ AWS resources destroyed successfully!"