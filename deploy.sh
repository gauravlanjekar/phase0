#!/bin/bash

# Mission Admin AWS Deployment Script

set -e

STACK_NAME="mission-admin-stack"
REGION="eu-central-1"
ENVIRONMENT="dev"

echo "🚀 Deploying Mission Admin to AWS..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if SAM CLI is installed
if ! command -v sam &> /dev/null; then
    echo "❌ SAM CLI is not installed. Please install it first."
    exit 1
fi

# Install Lambda dependencies
echo "📦 Installing Lambda dependencies..."
cd aws/lambda
npm install
cd ../..

# Build and deploy with SAM
echo "🏗️ Building SAM application..."
cd aws
sam build

echo "🚀 Deploying to AWS..."
sam deploy \
  --stack-name $STACK_NAME \
  --region $REGION \
  --parameter-overrides Environment=$ENVIRONMENT \
  --capabilities CAPABILITY_IAM \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset

# Get API URL
API_URL=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --region $REGION \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text)

echo "✅ Deployment complete!"
echo "🌐 API URL: $API_URL"
echo ""
echo "📝 Next steps:"
echo "1. Update src/services/api.js with the new API URL:"
echo "   const API_BASE = '$API_URL';"
echo "2. Redeploy your React app"

cd ..