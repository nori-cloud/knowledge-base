---

title: Temporal platform proof of concept
description: Progress, findings, and remaining work from the Temporal platform operator proof of concept.
---

## What am I looking at?

This document records the current Temporal platform proof of concept and the
remaining work needed to validate a complete workflow.

## What has been completed?

- Removed the TemporalProxy architecture.
- Added direct frontend connections through the operator.
- Split namespace and worker reconciliation into separate deployments.
- Added Argo applications for the Temporal platform and test component.
- Added a `TemporalWorker` using the public image:
  `ghcr.io/temporalio/benchmark-workers:main`.
- Added Kubernetes ownership from `TemporalWorker` to `TemporalNamespace`.
- The operator now wires `TemporalWorker` to an upstream `WorkerDeployment`.
- The target design keeps the Pod template unchanged and lets the upstream
  Worker Controller inject versioning and connection settings.
- Published operator chart `0.2.6`.
- Argo syncs the test application, but the benchmark worker remains
  `NotRegistered`/not Ready because it does not enable Worker Versioning.

## What did we learn about the benchmark worker?

The benchmark image starts successfully and connects to the Temporal frontend.
It runs normal workers, but it does not register Temporal Worker Versioning build
IDs. The upstream Worker Controller therefore reports the worker as
`NotRegistered` and does not mark it Ready.

Worker Versioning is needed for safe parallel worker versions, gradual rollouts,
rollback, and replay-safe workflow deployments.

## What remains to be done?

- [ ] Use a worker image that supports Temporal Worker Versioning build IDs.
- [x] Reuse one generated `Connection` per `TemporalNamespace`.
- [x] Remove wrapper-side environment injection and copy the Pod template
      unchanged into `WorkerDeployment`.
- [x] Forward optional rollout and sunset settings to `WorkerDeployment`.
- [ ] Run a sample workflow on the `benchmark` task queue.
- [ ] Confirm the workflow completes through the Argo-managed worker.
- [ ] Test deletion of `TemporalNamespace` and verify owner-reference garbage
      collection removes its `TemporalWorker`.
- [ ] Add automated end-to-end coverage for namespace and worker lifecycle.
- [ ] Decide whether the benchmark worker should remain as a permanent test
      component or be replaced with a small maintained demo worker.

## Which repositories contain the implementation?

- [Temporal platform operator](https://github.com/nori-cloud/temporal-platform-operator)
- [Infrastructure manifests](https://github.com/nori-cloud/infra)
- [Benchmark worker image](https://github.com/temporalio/benchmark-workers)
