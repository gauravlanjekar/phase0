Phase0 agent
=================

This directory contains a minimal Python agent that integrates with the Strands
library when available, and provides a fallback interactive CLI otherwise.

Features
- Uses the default Strands model when `strands` package is installed.
- Web search tool using DuckDuckGo HTML interface (no paid API required).
- MCP-like tool that calls your local server's REST API at `/api/missions/...`.


Quick start (create and use a local virtualenv)

This repo previously included a bundled virtualenv at `agent/my_agent_environment`. It's recommended to remove the checked-in virtualenv and create a fresh local environment instead.

1. Create and activate a new local virtualenv inside `agent/` (recommended name: `.venv`):

```bash
python3 -m venv agent/.venv
source agent/.venv/bin/activate
```

2. Install the dependencies from `agent/requirements.txt`:

```bash
pip install -r agent/requirements.txt
```

3. (If using AWS Bedrock) Set your AWS region and ensure your principal has Bedrock invoke permissions. Example (adjust region as needed):

```bash
aws configure set region ca-central-1
# attach the minimal policy or IAM role that allows bedrock:InvokeModel and bedrock:InvokeModelWithResponseStream.
# example policy provided in bedrock-invoke-policy.  Steps to create:
aws iam create-policy --policy-name BedrockInvokePolicy --policy-document bedrock-invoke-policy.json
aws iam attach-user-policy --user-name YOUR_IAM_USER --policy-arn arn:aws:iam::ACCOUNT_ID:policy/BedrockInvokePolicy
```

4. Run the agent script:

```bash
python agent/agent.py
```

If `strands` is installed in the environment, the script will attempt to build
an agent using the default strands model and provide an interactive prompt. If
not, a fallback CLI is started that demonstrates the websearch and MCP tools.

MCP tool usage
- list_missions -> GET /api/missions
- create_mission(brief) -> POST /api/missions
- delete_mission(id) -> DELETE /api/missions/:id
- get_tab(id, tabIndex) -> GET /api/missions/:id/tabs/:tabIndex
- put_tab(id, tabIndex, data) -> PUT /api/missions/:id/tabs/:tabIndex

Notes
- The websearch tool scrapes DuckDuckGo's HTML results. It's intended for demos
  and educational use. For production, replace with a proper search API.
- The `strands` library API varies between versions; the agent code is
  defensive and falls back to the CLI when an incompatible API surface is
  detected.
