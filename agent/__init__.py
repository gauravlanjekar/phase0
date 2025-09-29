"""agent package shim

Expose MCPClient at package level so tests and external callers can do
`from agent.agent import MCPClient` or `from agent import MCPClient`.
"""
from .agent import MCPClient, web_search, MCPClient  # re-export common symbols

__all__ = ["MCPClient", "web_search"]
