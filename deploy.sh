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

# Build React UI
echo "🏗️ Building React UI..."
npm run build

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

# Get outputs
API_URL=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --region $REGION \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text)

BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --region $REGION \
  --query 'Stacks[0].Outputs[?OutputKey==`UIBucketName`].OutputValue' \
  --output text)

UI_URL=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --region $REGION \
  --query 'Stacks[0].Outputs[?OutputKey==`UIUrl`].OutputValue' \
  --output text)

# Upload UI to S3
echo "📤 Uploading UI to S3..."
aws s3 sync ../build s3://$BUCKET_NAME --delete --region $REGION

# Invalidate CloudFront cache
DISTRIBUTION_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Origins.Items[0].DomainName=='$BUCKET_NAME.s3.$REGION.amazonaws.com'].Id" \
  --output text)

if [ ! -z "$DISTRIBUTION_ID" ]; then
  echo "🔄 Invalidating CloudFront cache..."
  aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*" > /dev/null
fi

echo "✅ Deployment complete!"
echo "🌐 UI URL: $UI_URL"
echo "🔗 API URL: $API_URL"
echo "📦 S3 Bucket: $BUCKET_NAME"

cd ..