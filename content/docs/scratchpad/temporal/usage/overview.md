---

title: "Temporal usage"
description: "Consumers declare a logical Temporal namespace and a worker. The operator wires the worker to the namespace, and the upstream Worker Controller manages its"
---

Consumers declare a logical Temporal namespace and a worker. The operator wires
the worker to the namespace, and the upstream Worker Controller manages its
versions.

```yaml
apiVersion: temporal.nori-cloud.io/v1alpha1
kind: TemporalNamespace
metadata:
  name: test
  namespace: app
spec:
  retentionDays: 7
---
apiVersion: temporal.nori-cloud.io/v1alpha1
kind: TemporalWorker
metadata:
  name: hello
  namespace: app
spec:
  temporalNamespaceRef:
    name: test
  template:
    spec:
      containers:
        - name: worker
          image: ghcr.io/example/worker@sha256:<digest>
```

The user creates only these two resources. The operator creates or reuses the
shared `Connection` and creates the upstream `WorkerDeployment`.

`spec.template` is copied unchanged. The upstream controller adds the
connection, namespace, deployment name, and Build ID environment variables
needed by the worker SDK.

## How does a worker update become a new version?

Change the image digest through GitOps:

```diff
- image: ghcr.io/example/worker@sha256:<old-digest>
+ image: ghcr.io/example/worker@sha256:<new-digest>
```

The upstream controller creates a new version, routes traffic according to its
rollout policy, keeps the old version for pinned workflows, and removes it after
the old version drains.
