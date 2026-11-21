---

title: "Operator chart"
description: "The chart installs the Nori Cloud operator and the upstream Temporal Worker Controller dependencies."
---

The chart installs the Nori Cloud operator and the upstream Temporal Worker
Controller dependencies.

## Controller deployments

The operator image runs as two deployments:

- `temporal-namespace-controller`
- `temporal-worker-controller`

Each controller can be enabled independently with Helm values. Both receive the
direct Temporal frontend address from Helm values:

```yaml
temporal:
  frontendAddress: temporal-frontend.temporal.svc.cluster.local:7233
```

```yaml
controllers:
  namespace:
    enabled: true
    replicaCount: 1
  worker:
    enabled: true
    replicaCount: 1
```

The chart does not install a Temporal proxy. A Temporal namespace is a logical
resource in the Temporal API, not a Kubernetes namespace. The worker controller
also reads `TemporalNamespace` resources so it can establish ownership and wait
for namespace readiness. It creates the upstream `WorkerDeployment` resources;
the upstream controller creates the versioned Kubernetes Deployments.

The upstream Worker Controller CRDs are a separate chart dependency. Upgrade the
CRDs before upgrading the controller that uses them.
