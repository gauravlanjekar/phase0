# Mission Planning LangGraph Agent

LangGraph-based agent for space mission design using SMAD methodology.

## Setup

```bash
npm install
cp .env.example .env
# Edit .env with your OpenAI API key
```

## Environment Variables

- `OPENAI_API_KEY` - OpenAI API key for GPT-4o-mini
- `AWS_REGION` - AWS region (default: eu-central-1)
- `MISSIONS_TABLE` - DynamoDB missions table
- `MISSION_DATA_TABLE` - DynamoDB mission data table
- `PORT` - Server port (default: 3002)

## Run

```bash
npm start
```

## Workflow

1. **Analyze** - Determines user intent and required action
2. **Execute** - Runs appropriate tool (get data, generate objectives, etc.)
3. **Respond** - Generates SMAD-expert response

## Tools

- `getMissionData` - Retrieve mission data from DynamoDB
- `saveObjectives` - Save generated objectives
- `saveRequirements` - Save generated requirements

## API

- `POST /chat` - Chat with the agent
  ```json
  {
    "message": "Help me define objectives",
    "missionId": "mission-123"
  }
  ```