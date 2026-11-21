---
title: Rotate an External Secret
description: Force External Secrets Operator to re-sync a secret and restart the app that uses it.
---

After changing a value in Infisical, force the ExternalSecret to sync now instead of waiting for its `refreshInterval`:

```bash
kubectl annotate es <name> force-sync=$(date +%s) --overwrite -n <namespace>
```

`es` is the short name for `externalsecrets`. Replace `<name>` and `<namespace>`, for example `boubou-app-secret` in `nori-cloud-dev`.

Check that it synced:

```bash
kubectl get es <name> -n <namespace> -o yaml | grep refreshTime
```

Syncing only updates the Kubernetes Secret. Running pods read environment variables at startup, so restart the app to pick up the new values:

```bash
kubectl rollout restart deployment/<app> -n <namespace>
```

For a `ClusterExternalSecret`, change the `external-secrets.io/force-sync` annotation instead:

```bash
kubectl annotate ces <name> external-secrets.io/force-sync=$(date +%s) --overwrite
```

Source: [External Secrets FAQ](https://external-secrets.io/latest/introduction/faq/#can-i-manually-trigger-a-secret-refresh).
