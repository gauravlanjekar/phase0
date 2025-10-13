#!/bin/bash

# Configuration
ACCOUNT_ID="886732474028"
REGION="eu-central-1"
REPOSITORY_NAME="phase0-agent"
IMAGE_TAG="latest"

# Build Docker image
echo "Building Docker image..."
docker build -t $REPOSITORY_NAME:$IMAGE_TAG .

# Get ECR login token
echo "Logging into ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com


# Tag image for ECR
echo "Tagging image..."
docker tag $REPOSITORY_NAME:$IMAGE_TAG $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$REPOSITORY_NAME:$IMAGE_TAG

# Push to ECR
echo "Pushing to ECR..."
docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$REPOSITORY_NAME:$IMAGE_TAG

# Deploy agent runtime
echo "Deploying agent runtime..."
node deploy.js

echo "Deployment complete!"