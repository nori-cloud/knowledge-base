---

title: Kubernetes Read-Only MCP
description: Connect to the Kubernetes read-only MCP server and understand its capabilities.
---

## How do I connect?

Connect your device to the tailnet, then add the remote MCP server:

```bash
opencode mcp add kubernetes-readonly
```

Use this URL when prompted:

```text
https://kubernetes-readonly-mcp.hoki-sole.ts.net/mcp
```

## What can it do?

- List and inspect Kubernetes workloads and resources.
- Read pod logs and cluster events.
- Inspect networking, storage, nodes, and metrics.
- Show resource YAML and available Kubernetes APIs.
- It cannot read Secrets or create, update, patch, or delete resources.
