---

title: "Operator implementation plan"
description: "TemporalNamespace. upstream Worker Controller."
---

## Goals

- Register logical Temporal namespaces from Kubernetes resources.
- Resolve `TemporalWorker.spec.temporalNamespaceRef` to a ready
  `TemporalNamespace`.
- Reuse one generated `Connection` for each `TemporalNamespace`.
- Create one upstream `WorkerDeployment` for each `TemporalWorker`.
- Copy `TemporalWorker.spec.template` unchanged into the upstream resource.
- Delegate worker versioning, routing, rollout, rollback, and cleanup to the
  upstream Worker Controller.
- Keep namespace and worker reconciliation in separate deployments.

## Runtime shape

The image supports a controller selector:

```text
--controller=namespace
--controller=worker
```

The chart runs one deployment for each enabled controller and supplies the same
non-secret `temporal.frontendAddress` value. The namespace controller uses it
to create a Temporal SDK client. The worker controller uses it only for shared
`Connection` resources. Worker Pod configuration belongs to the upstream
`WorkerDeployment`.

Workers are linked to their referenced `TemporalNamespace` with a Kubernetes
owner reference before the namespace readiness check. This lets namespace
deletion observe and wait for dependent workers while workers still report a
pending status until the namespace is ready.

## Worker update flow

1. GitOps updates the `TemporalWorker` Pod template, usually the image digest.
2. The wrapper copies the template to `WorkerDeployment`.
3. The upstream controller derives a new Build ID and creates a new Kubernetes
   Deployment.
4. The upstream controller registers and routes the new version in Temporal.
5. The old version remains until its workflows drain, then is cleaned up.

The wrapper must not add managed environment variables or implement a second
rollout engine. The upstream controller supplies
`TEMPORAL_ADDRESS`, `TEMPORAL_NAMESPACE`, `TEMPORAL_DEPLOYMENT_NAME`, and
`TEMPORAL_WORKER_BUILD_ID` to worker Pods.

## Deliberate non-goals

- No Temporal proxy deployment.
- No authentication or TLS in the initial trusted-cluster setup.
- No custom Worker Controller fork.
- No tenant isolation claim based only on Kubernetes namespaces.

Future work can add Temporal authentication, TLS, or multi-cluster routing if
those requirements appear.
