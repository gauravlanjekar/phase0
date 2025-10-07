# Running Locally

## Quick Start

```bash
./start-local.sh
```

This starts all three services:
- **Frontend**: http://localhost:3000 (React app)
- **API Server**: http://localhost:3001 (Express with in-memory storage)
- **LangGraph Agent**: http://localhost:3002 (AI agent with SMAD expertise)

## Manual Setup

### 1. Local API Server
```bash
cd server
npm install
npm start  # Port 3001
```

### 2. LangGraph Agent
```bash
cd langgraph-agent
npm install
cp .env.example .env
# Add your OPENAI_API_KEY to .env
npm start  # Port 3002
```

### 3. React Frontend
```bash
npm install
npm start  # Port 3000
```

## Features

- **In-memory storage** - No AWS/DynamoDB needed
- **LangGraph AI agent** - SMAD methodology expertise
- **Full UI** - Mission creation, objectives, requirements, chat
- **Local development** - Fast iteration, no cloud dependencies