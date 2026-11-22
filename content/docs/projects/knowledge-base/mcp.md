---
title: Knowledge Base MCP server
description: Connect an AI agent to search and read the Knowledge Base.
---

## What am I looking at?

The Knowledge Base MCP server lets agents list, search, and read documentation.
It is read-only and includes docs loaded from GitHub.

## How do I connect?

Connect your device to the tailnet, then add the server to OpenCode:

```sh
opencode mcp add knowledge-base --global --url https://docs.hoki-sole.ts.net/api/mcp
opencode mcp list
```

The server is part of the dev Knowledge Base app. It has no separate login, so
keep it behind a trusted private network.

## What can it do?

| Tool | Purpose |
| --- | --- |
| `list_pages` | List documentation pages. |
| `search` | Search the docs by topic. |
| `get_page` | Read a page as Markdown using its docs URL path. |

## Is there any external references to this documentation?

- [OpenCode MCP servers](https://opencode.ai/docs/mcp-servers) — setup and configuration.
