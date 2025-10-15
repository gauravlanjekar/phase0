# Mission Admin App

A modern React application with serverless REST API for mission management.

## Setup Options

### Option 1: AWS Serverless (Recommended)

**Prerequisites:**
- AWS CLI configured
- SAM CLI installed

**Deploy to AWS:**
```bash
./deploy.sh
```

**Create your first user:**
```bash
# The deploy script will output commands like these:
aws cognito-idp admin-create-user --user-pool-id YOUR_POOL_ID --username admin --temporary-password TempPass123! --message-action SUPPRESS
aws cognito-idp admin-set-user-password --user-pool-id YOUR_POOL_ID --username admin --password YourPassword123! --permanent
```

**Cleanup AWS resources:**
```bash
./destroy.sh
```

### Option 2: Local Development

**Backend (Express):**
```bash
cd server
npm install
npm start
```

**Frontend:**
```bash
npm install
npm start
```

## AWS Architecture

- **AWS Cognito** - User authentication and authorization
- **Application Load Balancer** - API routing with custom domain
- **Lambda Functions** - Serverless compute with JWT validation
- **DynamoDB** - NoSQL database with user-scoped data
- **S3 + CloudFront** - Static website hosting
- **CloudFormation** - Infrastructure as Code

## API Endpoints

- `GET /missions` - Get all missions
- `POST /missions` - Create new mission
- `DELETE /missions/{id}` - Delete mission
- `GET /missions/{id}/tabs/{tabIndex}` - Get tab data
- `PUT /missions/{id}/tabs/{tabIndex}` - Save tab data
- `POST /missions/{id}/chat` - Send chat message

## Features

- **AWS Cognito Authentication** - Secure user authentication with JWT tokens
- Mission CRUD operations (user-scoped)
- Mission workspace with chat
- 10 structured mission tabs including 3D visualization
- **3D Mission Visualization** - Interactive Cesium-powered Earth view with satellite orbits and ground stations
- Modern glassmorphism UI
- Serverless AWS deployment