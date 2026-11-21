---
title: Kill a port
description: Stop the process listening on a TCP port.
---

```bash
lsof -tiTCP:4321 -sTCP:LISTEN | xargs -r kill
```

Replace `4321` with the port you need.
