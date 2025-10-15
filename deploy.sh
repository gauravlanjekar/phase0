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

USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --region $REGION \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text)

CLIENT_ID=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --region $REGION \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' \
  --output text)

COGNITO_DOMAIN=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --region $REGION \
  --query 'Stacks[0].Outputs[?OutputKey==`CognitoDomain`].OutputValue' \
  --output text)

# Update .env file with Cognito configuration
echo "🔧 Updating .env file with Cognito configuration..."
cd ..
sed -i.bak "s|REACT_APP_USER_POOL_ID=.*|REACT_APP_USER_POOL_ID=$USER_POOL_ID|" .env
sed -i.bak "s|REACT_APP_CLIENT_ID=.*|REACT_APP_CLIENT_ID=$CLIENT_ID|" .env
sed -i.bak "s|REACT_APP_COGNITO_DOMAIN=.*|REACT_APP_COGNITO_DOMAIN=$COGNITO_DOMAIN|" .env
rm .env.bak

# Rebuild with updated configuration
echo "🔄 Rebuilding with Cognito configuration..."
npm run build

# Upload UI to S3
echo "📤 Uploading UI to S3..."
aws s3 sync build s3://$BUCKET_NAME --delete --region $REGION
cd aws

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
echo "🔐 User Pool ID: $USER_POOL_ID"
echo "🔑 Client ID: $CLIENT_ID"
echo "🌍 Cognito Domain: $COGNITO_DOMAIN"
echo ""
echo "📝 Next steps:"
echo "1. Create a user in the Cognito User Pool:"
echo "   aws cognito-idp admin-create-user --user-pool-id $USER_POOL_ID --username admin --temporary-password TempPass123! --message-action SUPPRESS"
echo "2. Set permanent password:"
echo "   aws cognito-idp admin-set-user-password --user-pool-id $USER_POOL_ID --username admin --password YourPassword123! --permanent"
echo "3. Visit $UI_URL to login"

cd ..