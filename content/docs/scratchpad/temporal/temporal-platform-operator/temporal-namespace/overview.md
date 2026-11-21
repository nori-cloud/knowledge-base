---

title: "TemporalNamespace"
description: "TemporalNamespace declares a logical namespace in the Temporal cluster."
---

`TemporalNamespace` declares a logical namespace in the Temporal cluster.

```yaml
apiVersion: temporal.nori-cloud.io/v1alpha1
kind: TemporalNamespace
metadata:
  name: test
  namespace: temporal
spec:
  retentionDays: 7
```

The namespace controller uses the chart's `temporal.frontendAddress` to
register the namespace and keep its retention period synchronized. Newly
registered Temporal namespaces receive operator ownership metadata, including
the Kubernetes resource UID.

## Lifecycle

- The resource name becomes the Temporal namespace name.
- Retention is validated between 7 and 30 days.
- The controller refuses to take over an existing Temporal namespace owned by a
  different resource.
- Deletion waits for managed `TemporalWorker` resources before removing the
  Temporal namespace.
- A missing Temporal namespace during deletion is treated as already deleted.

Kubernetes namespace and Temporal namespace are separate concepts. The
operator resource is namespaced for Kubernetes ownership, while Temporal
receives the logical namespace name in the API request.
