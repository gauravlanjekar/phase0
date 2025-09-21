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

**Update frontend API URL:**
```bash
# Copy the API URL from deploy output and update src/services/api.js
const API_BASE = 'https://your-api-id.execute-api.us-east-1.amazonaws.com/dev';
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

- **API Gateway** - REST API endpoints
- **Lambda Functions** - Serverless compute
- **DynamoDB** - NoSQL database
- **CloudFormation** - Infrastructure as Code

## API Endpoints

- `GET /missions` - Get all missions
- `POST /missions` - Create new mission
- `DELETE /missions/{id}` - Delete mission
- `GET /missions/{id}/tabs/{tabIndex}` - Get tab data
- `PUT /missions/{id}/tabs/{tabIndex}` - Save tab data
- `POST /missions/{id}/chat` - Send chat message

## Features

- Authentication (mock)
- Mission CRUD operations
- Mission workspace with chat
- 9 structured mission tabs
- Modern glassmorphism UI
- Serverless AWS deployment