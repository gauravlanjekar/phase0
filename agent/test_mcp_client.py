"""Simple smoke test for MCPClient.

Run this while your server is running (node server/server.js). It will try to
call list_missions and fetch tab 0 for the first mission if available.
"""
try:
    # Preferred: run as module from repo root: python -m agent.test_mcp_client
    from agent.agent import MCPClient
except Exception:
    # Fallback: running the test script directly (python agent/test_mcp_client.py)
    # when the current working directory is the repo root or otherwise. Add
    # the repo root to sys.path so `agent` package may be imported.
    import os
    import sys

    repo_root = os.path.dirname(os.path.dirname(__file__))
    if repo_root not in sys.path:
        sys.path.insert(0, repo_root)
    # If a top-level module named 'agent' was created by the earlier failed
    # import attempt (pointing at agent/agent.py), remove it so Python can
    # properly import the package `agent` from the repo root we added above.
    if 'agent' in sys.modules:
        del sys.modules['agent']

    from agent.agent import MCPClient


def main():
    client = MCPClient()
    try:
        missions = client.list_missions()
        print('missions:', missions)
        if missions:
            first = missions[0]
            mid = first.get('id')
            print('fetching tab 0 for mission id', mid)
            tab = client.get_tab(mid, 0)
            print('tab 0:', tab)
    except Exception as e:
        print('error while contacting server:', e)


if __name__ == '__main__':
    main()
