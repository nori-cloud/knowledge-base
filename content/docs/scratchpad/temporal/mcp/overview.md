---

title: "Temporal MCP"
description: "Connect the Temporal docs MCP server (https://temporal.mcp.kapa.ai) to opencode. The server requires OAuth sign-in."
---

Connect the Temporal docs MCP server (`https://temporal.mcp.kapa.ai`) to
opencode. The server requires OAuth sign-in.

## Configure

```bash
opencode mcp add temporal
```

Use `https://temporal.mcp.kapa.ai` as the remote MCP server URL when prompted.

## Authenticate

```bash
opencode mcp auth temporal
opencode mcp list          # verify status
opencode mcp debug temporal
```

## Remote devbox + OAuth callback loopback

When opencode runs on a remote devbox but the browser is on the host, the OAuth
callback is a problem. opencode's MCP OAuth callback binds to
`127.0.0.1:19876` and holds the OAuth `state` in memory with a 5-minute expiry.
A browser on the host cannot reach the devbox's loopback, and a slow login
expires the state.

Loop the callback back to the devbox with an SSH local port forward. Run this on
the **host**, in a separate terminal:

```bash
ssh -L 19876:127.0.0.1:19876 <user>@<devbox>
```

Then auth quickly (well under the 5-minute window):

```bash
opencode mcp logout temporal
opencode mcp auth temporal   # open the printed URL on the host immediately
```

### Troubleshooting

- **`Invalid or expired state parameter`** — the `state` expired (5-minute TTL)
  or was replaced by a newer auth attempt. Run `opencode mcp logout temporal`,
  then `opencode mcp auth temporal` again and finish the login fast. Do not keep
  an old authorization URL open in a stale browser tab.
- **Connection refused on callback** — the SSH forward is not running, or the
  port does not match opencode's callback port (default `19876`).
