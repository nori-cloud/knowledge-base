---

title: "Temporal worker controller"
description: "TemporalWorker is a small namespace-wiring wrapper around the upstream Temporal Worker Controller. Users write TemporalWorker; the wrapper creates"
---

`TemporalWorker` is a small namespace-wiring wrapper around the upstream
Temporal Worker Controller. Users write `TemporalWorker`; the wrapper creates
the upstream `WorkerDeployment` that owns worker versions and rollouts.

```yaml
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

The wrapper controller:

1. Resolves the referenced `TemporalNamespace` and records it as the worker's
   Kubernetes owner.
2. Waits for the referenced `TemporalNamespace` to become Ready.
3. Reuses or creates the shared `Connection` for that `TemporalNamespace`.
4. Creates or updates the upstream `WorkerDeployment` with the Temporal
   namespace and `Connection` references.
5. Copies `spec.template` unchanged into the upstream resource.
6. Mirrors upstream worker status back to `TemporalWorker` and removes the
   generated resource during deletion.

No proxy reference or proxy service is required. The endpoint comes from the
operator chart's `temporal.frontendAddress` value.

## Versioning

Every wrapped worker uses the upstream Worker Controller. A change to the
copied Pod template, such as an immutable image update, creates a new worker
version. The upstream controller supplies these environment variables to the
worker process:

- `TEMPORAL_ADDRESS`
- `TEMPORAL_NAMESPACE`
- `TEMPORAL_DEPLOYMENT_NAME`
- `TEMPORAL_WORKER_BUILD_ID`

The worker application must use the deployment name and Build ID with its
Temporal SDK's Worker Versioning options. The wrapper does not implement its own
version calculation, rollout strategy, traffic routing, or sunset logic.

Do not use `latest` image tags. A mutable tag can change the code without
creating a clear, reviewable GitOps version.
