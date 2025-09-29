#!/usr/bin/env python3
"""
Simple agent that integrates with the Strands Python library when available.

Features:
- Uses the default Strands LLM model if the `strands` package is installed.
- Provides a WebSearch tool (DuckDuckGo HTML search + BeautifulSoup parsing).
- Provides an MCP-backed tool that calls a local server's REST API at /api/missions/...

If `strands` is not installed this script falls back to a small interactive CLI
that demonstrates the websearch and MCP tool behavior.

Place this file inside the provided virtualenv and install requirements from
`agent/requirements.txt` (see README.md for steps).
"""
from __future__ import annotations

import json
import sys
import time
from dataclasses import dataclass
from typing import Any, Callable, Dict, Optional

import requests

try:
    from bs4 import BeautifulSoup
except Exception:
    BeautifulSoup = None  # optional


# Try to import Agent and tool decorator from strands at module import time so the
# Agent class exists as an explicit symbol rather than looked up dynamically.
try:
    from strands import Agent as StrandsAgent, tool as strands_tool
except Exception:
    StrandsAgent = None
    strands_tool = None


@dataclass
class Tool:
    name: str
    description: str
    func: Callable[..., Any]


def web_search(query: str, max_results: int = 3, timeout: float = 10.0) -> Dict[str, Any]:
    """Very small DuckDuckGo HTML search scraper.

    This avoids requiring a paid search API. It's lightweight and returns a list
    of results with title, link and snippet. Works best for quick demos.
    """
    if BeautifulSoup is None:
        return {"error": "beautifulsoup4 not installed"}

    headers = {"User-Agent": "phase0-agent/1.0"}
    params = {"q": query}
    url = "https://html.duckduckgo.com/html/"
    try:
        r = requests.post(url, data=params, headers=headers, timeout=timeout)
        r.raise_for_status()
    except Exception as e:
        return {"error": str(e)}

    soup = BeautifulSoup(r.text, "html.parser")
    results = []
    for a in soup.select(".result__a")[:max_results]:
        title = a.get_text(strip=True)
        link = a.get('href')
        snippet_tag = a.find_parent().select_one('.result__snippet')
        snippet = snippet_tag.get_text(strip=True) if snippet_tag else ''
        results.append({"title": title, "link": link, "snippet": snippet})

    return {"query": query, "results": results}


class MCPClient:
    """Small MCP-like client wrapper that talks to server REST API endpoints.

    This is intentionally minimal: it issues HTTP requests to the server base URL
    and returns JSON responses. It's provided as a tool for the agent to call
    your `/api/missions` endpoints.
    """

    def __init__(self, base_url: str = "http://localhost:3001"):
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()

    def list_missions(self) -> Any:
        url = f"{self.base_url}/api/missions"
        r = self.session.get(url, timeout=8)
        r.raise_for_status()
        return r.json()

    def create_mission(self, brief: str) -> Any:
        url = f"{self.base_url}/api/missions"
        r = self.session.post(url, json={"brief": brief}, timeout=8)
        r.raise_for_status()
        return r.json()

    def delete_mission(self, mission_id: str) -> Any:
        url = f"{self.base_url}/api/missions/{mission_id}"
        r = self.session.delete(url, timeout=8)
        if r.status_code not in (200, 204):
            r.raise_for_status()
        return {"status": r.status_code}

    def get_tab(self, mission_id: str, tab_index: int) -> Any:
        url = f"{self.base_url}/api/missions/{mission_id}/tabs/{tab_index}"
        r = self.session.get(url, timeout=8)
        r.raise_for_status()
        return r.json()

    def put_tab(self, mission_id: str, tab_index: int, data: Dict[str, Any]) -> Any:
        url = f"{self.base_url}/api/missions/{mission_id}/tabs/{tab_index}"
        r = self.session.put(url, json=data, timeout=8)
        r.raise_for_status()
        return r.json()

    def chat(self, mission_id: str, message: str) -> Any:
        url = f"{self.base_url}/api/missions/{mission_id}/chat"
        r = self.session.post(url, json={"message": message}, timeout=8)
        r.raise_for_status()
        return r.json()


def make_strands_tools(mcp_base_url: str = "http://localhost:3001") -> list:
    """Return a list of Tool-like objects for Strands or our fallback.

    The `strands` library may expect a specific Tool class/signature; here we
    return simple dataclasses that can be adapted to Strands' API when present.
    """
    # Return lightweight tool descriptors for the fallback. When Strands is
    # available the agent will create proper decorated functions.
    client = MCPClient(mcp_base_url)

    mcp_tool = Tool(
        name="missions_api",
        description="Calls your local /api/missions REST API. Usage: action and params.",
        func=client,
    )

    web_tool = Tool(
        name="websearch",
        description="Web search tool using DuckDuckGo HTML results. Usage: query string.",
        func=web_search,
    )

    return [web_tool, mcp_tool]


def run_fallback_cli():
    """Interactive fallback that demonstrates the tools without Strands."""
    print("Strands not available — running fallback interactive CLI.")
    print("Commands:")
    print("  search:<query>")
    print("  list-missions")
    print("  create-mission:<brief>")
    print("  get-tab:<mission_id>:<tab_index>")
    print("  exit")
    client = MCPClient()

    while True:
        try:
            line = input('> ').strip()
        except (EOFError, KeyboardInterrupt):
            print('\nbye')
            return

        if not line:
            continue
        if line == 'exit':
            return

        if line.startswith('search:'):
            q = line.split(':', 1)[1]
            print(json.dumps(web_search(q), indent=2))
            continue

        if line == 'list-missions':
            try:
                print(json.dumps(client.list_missions(), indent=2))
            except Exception as e:
                print('error:', e)
            continue

        if line.startswith('create-mission:'):
            brief = line.split(':', 1)[1]
            try:
                print(json.dumps(client.create_mission(brief), indent=2))
            except Exception as e:
                print('error:', e)
            continue

        if line.startswith('get-tab:'):
            parts = line.split(':')
            if len(parts) >= 3:
                mission_id = parts[1]
                tab_index = int(parts[2])
                try:
                    print(json.dumps(client.get_tab(mission_id, tab_index), indent=2))
                except Exception as e:
                    print('error:', e)
            else:
                print('usage: get-tab:<mission_id>:<tab_index>')
            continue

        print('unknown command')


def main():
    # Try to import strands and wire tools into it if available.
    try:
        import strands  # type: ignore
    except Exception:
        strands = None

    tools = make_strands_tools()

    if strands is None:
        run_fallback_cli()
        return

    # If strands is installed we attempt to construct an agent using the
    # default model. The exact API of strands may vary; adapt as needed.
    print('Strands library detected — attempting to create an agent using the default model')
    try:
        # Typical pattern: strands.Agent(...). This is defensive since API
        # shapes differ between versions.
        # Use module-level imports performed at file import time.
        Agent = StrandsAgent
        tool_decorator = strands_tool
        if Agent is None or tool_decorator is None:
            print("Strands package does not expose Agent class or tool decorator — running fallback instead")
            run_fallback_cli()
            return

        # Create actual function-based tools decorated with @strands.tool so the
        # Agent receives proper tool objects (not dicts or custom dataclasses).
        client = MCPClient()

        @tool_decorator
        def websearch(query: str) -> dict:
            """Web search (DuckDuckGo HTML)"""
            return web_search(query)

        @tool_decorator
        def missions_api(action: str, **kwargs) -> dict:
            """MCP wrapper to call /api/missions endpoints.

            Usage examples:
              - action="list"
              - action="create", brief="..."
              - action="delete", mission_id="..."
              - action="get_tab", mission_id="...", tab_index=0
              - action="put_tab", mission_id="...", tab_index=0, data={...}
            """
            try:
                if action == "list":
                    return {"status": "success", "result": client.list_missions()}
                if action == "create":
                    brief = kwargs.get("brief", "")
                    return {"status": "success", "result": client.create_mission(brief)}
                if action == "delete":
                    mid = kwargs.get("mission_id")
                    return {"status": "success", "result": client.delete_mission(mid)}
                if action == "get_tab":
                    mid = kwargs.get("mission_id")
                    ti = int(kwargs.get("tab_index", 0))
                    return {"status": "success", "result": client.get_tab(mid, ti)}
                if action == "put_tab":
                    mid = kwargs.get("mission_id")
                    ti = int(kwargs.get("tab_index", 0))
                    data = kwargs.get("data", {})
                    return {"status": "success", "result": client.put_tab(mid, ti, data)}
                return {"status": "error", "message": f"Unknown action: {action}"}
            except Exception as e:
                return {"status": "error", "error": str(e)}

        # Pass the function objects directly to Agent; the decorator turns them into AgentTool objects
        # Do not pass the literal string 'default' as a model id (some providers reject it).
        # Let Strands choose its provider default or use configured model settings.
        agent = Agent(model = "anthropic.claude-3-sonnet-20240229-v1:0", tools=[websearch, missions_api])

        # Provide a simple interactive loop to ask the agent questions.
        print("Agent ready. Type messages to send to the agent (Ctrl-C to exit).")
        while True:
            question = input("You: ")
            if not question:
                continue
            resp = agent(question)
            # AgentResult implements __str__ to extract textual content; otherwise print repr
            try:
                print("Agent:", str(resp))
            except Exception:
                print("Agent result:", repr(resp))

    except Exception as e:
        print('error while using strands:', e)
        print('falling back to CLI')
        run_fallback_cli()


if __name__ == '__main__':
    main()
