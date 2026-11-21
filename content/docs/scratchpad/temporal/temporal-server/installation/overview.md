---

title: Temporal Server installation
description: Installation plan for self-hosting Temporal Server in the Nori Cloud cluster.
---

## What am I looking at?

This document defines the installation plan for self-hosted Temporal Server. It deliberately comes before the platform operator and worker-controller integration so we can verify what the self-hosted server provides and where it differs from Temporal Cloud.

The first installation target is a private dev instance managed by Argo CD and Helm, with PostgreSQL persistence supplied by the existing CloudNativePG service at `infra/services/cloudnativepg/`.

Initial decisions:

- Temporal Helm chart `1.7.0`, which packages Temporal Server `1.32.0` at the time of writing.
- CloudNativePG Helm chart `0.29.0`, already installed by the infrastructure repository.
- Infisical project `infra-4vm-m`, environment `prod`, secrets under `/temporal`.
- ESO auth Secret manifest: `infra/services/temporal/infisical-universal-auth-sealed-secret.yaml`.
- Web UI hostname `temporal.hoki-sole.ts.net` through Tailscale, with hostname `temporal`.
- Frontend gRPC remains cluster-internal for control-plane and data-plane APIs.
- Internode traffic plaintext for the initial dev installation.
- Backups deferred; this installation is not production-ready until backup and restore are added.

## What does self-hosted Temporal provide?

The official Temporal Helm chart deploys the Temporal server components:

- Frontend service — gRPC API used by clients and workers.
- History service — durable workflow execution state and event history.
- Matching service — task queues and worker polling.
- Internal worker service — Temporal's internal background work.
- Optional Temporal Web UI.
- Kubernetes Services, health checks, metrics configuration, and schema/bootstrap jobs.

The chart does **not** install a database. We must provide and operate the persistence stores separately.

Temporal Server executes workflow state transitions, but it does not execute application workflow code. Application workers remain consumer-owned deployments.

## How is self-hosted different from Temporal Cloud?

| Concern                   | Self-hosted Temporal                                         | Temporal Cloud                                  |
| ------------------------- | ------------------------------------------------------------ | ----------------------------------------------- |
| Server operations         | We deploy, upgrade, monitor, and recover the server.         | Managed by Temporal.                            |
| Persistence               | We provide default and visibility stores.                    | Managed service boundary.                       |
| Frontend endpoint         | Private cluster Service.                                     | Cloud endpoint.                                 |
| Authentication            | We configure TLS and/or JWT authorization.                   | Cloud identity and API-key model.               |
| Namespace administration  | Our controller/CLI uses the self-hosted administrative APIs. | Cloud Ops API.                                  |
| Service accounts/API keys | Not supplied automatically by the server chart.              | Cloud APIs can provide these identities.        |
| Backups and recovery      | Our responsibility.                                          | Service responsibility, subject to Cloud terms. |

The platform operator must not assume that Temporal Cloud service accounts or Cloud Ops API keys exist in a self-hosted installation. Worker connectivity initially uses the private frontend address configured in the operator chart.

## Which chart should we install?

Use the official [Temporal Helm chart](https://github.com/temporalio/helm-charts/tree/main/charts/temporal), pinned to chart `1.7.0` and server `1.32.0` for the first installation. The chart should be wrapped by our Temporal platform umbrella chart together with the Temporal Worker Controller and platform operator. Re-check the latest release before implementation; do not use an unpinned `latest` dependency.

The umbrella chart should not add a database subchart. PostgreSQL remains an explicit platform dependency so its backup, storage, and lifecycle are visible in our infrastructure design.

## What exact Helm values will we use?

The umbrella chart should pass values equivalent to this PostgreSQL configuration:

```yaml
server:
  config:
    logLevel: info
    persistence:
      defaultStore: default
      visibilityStore: visibility
      numHistoryShards: 512
      datastores:
        default:
          sql:
            pluginName: postgres12
            databaseName: temporal
            connectAddr: temporal-postgres-rw.temporal.svc.cluster.local:5432
            connectProtocol: tcp
            user: temporal
            createDatabase: false
            manageSchema: true
            existingSecret: temporal-server-db
            secretKey: password
            maxConns: 20
            maxIdleConns: 20
            maxConnLifetime: 1h
        visibility:
          sql:
            pluginName: postgres12
            databaseName: temporal_visibility
            connectAddr: temporal-postgres-rw.temporal.svc.cluster.local:5432
            connectProtocol: tcp
            user: temporal
            createDatabase: false
            manageSchema: true
            existingSecret: temporal-server-db
            secretKey: password
            maxConns: 20
            maxIdleConns: 20
            maxConnLifetime: 1h

frontend:
  enabled: true
  service:
    type: ClusterIP
  ingress:
    enabled: false

web:
  enabled: true
  service:
    type: ClusterIP
  ingress:
    enabled: false
```

`createDatabase: false` keeps database ownership with CNPG. `manageSchema: true` lets Temporal run its schema setup and upgrade jobs. The frontend and Web UI remain ClusterIP Services; Tailscale access is configured outside the Temporal chart.

The exact field names must be checked against chart `1.7.0` during rendering before deployment.

## What persistence does Temporal require?

Configure two logical stores:

1. **Default store** — workflow history, mutable state, tasks, and execution data.
2. **Visibility store** — searchable workflow execution records.

The initial plan is PostgreSQL for both stores, using one CNPG cluster and a dedicated `temporal` database role. Do not use the PostgreSQL superuser for Temporal. CloudNativePG can create the role and permissions through a `DatabaseRole` resource, using the ESO-provided password Secret. It can also create the `temporal` and `temporal_visibility` databases through `Database` resources, both owned by the `temporal` role.

The role should have `login: true`, `superuser: false`, and only the database permissions required by Temporal schema management. Use the existing CNPG patterns in `apps/vesta/base/database-role.yaml` and `apps/vesta/base/database.yaml` as the starting point.

The chart then manages Temporal schemas against those pre-created databases. `numHistoryShards` must be selected before the first deployment and must not be changed casually afterward.

The initial configuration can be represented as dotenv values:

```dotenv
TEMPORAL_DB_HOST=temporal-postgres-rw.temporal.svc.cluster.local
TEMPORAL_DB_PORT=5432
TEMPORAL_DB_USER=temporal
TEMPORAL_DB_PASSWORD=<generate-and-store-securely>
TEMPORAL_DB_NAME=temporal
TEMPORAL_VISIBILITY_DB_NAME=temporal_visibility
TEMPORAL_DB_ROLE=temporal
TEMPORAL_FRONTEND_HOST=temporal-frontend.temporal.svc.cluster.local
TEMPORAL_FRONTEND_PORT=7233
TEMPORAL_WEB_TAILNET_HOST=temporal.hoki-sole.ts.net
TEMPORAL_WEB_TAILNET_NAME=temporal
```

The password should come from the two ESO-managed Secrets described above. Use this Infisical key for both database ExternalSecrets:

```text
/temporal/TEMPORAL_DB_PASSWORD
```

The username `temporal` and database names are non-secret configuration. Do not commit this dotenv file or put the password in Helm values.

## What should the first installation include?

The first dev installation should include:

- Temporal Server frontend, history, matching, and internal worker services.
- Temporal Web UI as an internal ClusterIP Service.
- PostgreSQL default and visibility databases.
- Schema and namespace bootstrap jobs.
- Resource requests and limits.
- Pod disruption and topology settings appropriate for the cluster size.
- Metrics endpoints and ServiceMonitor integration where supported.
- NetworkPolicies allowing only required database, Web UI, operator, and worker/client traffic.
- Separate ExternalSecret-managed database Secrets for CNPG and Temporal.
- Optional TLS Secrets from cert-manager or External Secrets.

The frontend remains a ClusterIP Service and is reachable only from inside the cluster. The Web UI is exposed privately through Tailscale at `temporal.hoki-sole.ts.net` with hostname `temporal`. Internode traffic remains plaintext for the first installation; TLS can be added later.

## Which authentication model should we use?

Authentication is a server installation decision, not a later worker-controller feature.

Evaluate these options in order:

1. Keep frontend gRPC internal for control-plane and data-plane APIs.
2. Use Tailscale as the private access boundary for Web UI only.
3. Keep internode traffic plaintext for the first installation.
4. Add frontend TLS/mTLS when external access or production requirements justify it.
5. Add JWT authentication and an authorization policy if we need identity and permission claims.

The platform operator's administrative credential is not part of the Temporal Server installation. When the operator is added, it will receive its credential through a separate Kubernetes Secret and use the selected self-hosted frontend authentication mechanism. It is not a Temporal Cloud Ops API key unless the selected self-hosted deployment explicitly provides that compatible API.

Worker credentials, if required later, are separate from the server installation.
The server chart does not create worker service accounts or API keys for us.

## Which Kubernetes resources are required?

The first service release needs these resources:

- `Namespace/temporal`.
- `SecretStore/temporal` and its sealed Infisical authentication Secret.
- `ExternalSecret/temporal-db-role` and target Secret `temporal-db-role`.
- `ExternalSecret/temporal-server-db` and target Secret `temporal-server-db`.
- `Cluster/temporal-postgres`.
- `DatabaseRole/temporal`.
- `Database/temporal` and `Database/temporal_visibility`.
- The Temporal Helm release with frontend, history, matching, internal worker, and Web UI enabled.
- Tailscale Ingress for private Web UI access at `temporal.hoki-sole.ts.net`.
- NetworkPolicies, resource settings, and monitoring.
- No backup resources yet; backup and restore are a required follow-up before production.

The plan is complete at the architecture level. Manifest implementation still needs the pinned versions, Infisical key wiring, Tailscale resources, resource values, and Helm rendering checks.

## Which secrets are required?

The server installation needs these secrets:

| Secret                        | Created by             | Used by                           |
| ----------------------------- | ---------------------- | --------------------------------- |
| Infisical auth Secret         | SealedSecret/bootstrap | `SecretStore/temporal`            |
| `temporal-db-role`            | External Secrets       | CNPG `DatabaseRole/temporal`      |
| `temporal-server-db`          | External Secrets       | Temporal Helm persistence config  |
| Frontend/internode TLS Secret | Not needed initially   | Optional future TLS configuration |

The two database Secrets may read the same password from Infisical, but remain separate Kubernetes Secrets with different data shapes and RBAC. The Temporal Server installation does not need worker API keys or platform-operator credentials for the initial trusted in-cluster setup.

## What is the installation sequence?

### Stage 1 — Pin versions and dependencies

Choose the Temporal server version, Helm chart version, Worker Controller version, PostgreSQL version, and platform operator version. Confirm compatibility before writing the umbrella chart.

**Testable outcome:** A version matrix and rollback boundary are recorded.

### Stage 2 — Prepare PostgreSQL

Create the namespace-scoped `SecretStore`, then one CNPG cluster, a dedicated `temporal` database role, the default and visibility databases, credentials, storage, and monitoring. Verify connectivity from the target namespace without exposing credentials. Do not add backup resources yet.

**Testable outcome:** Both persistence stores accept connections. Backup/restore remains an explicit production-readiness gap.

### Stage 3 — Install Temporal Server

Deploy the umbrella chart through Argo CD with the Temporal chart configured for PostgreSQL. Keep the frontend internal and enable Web UI only on the private access path.

**Testable outcome:** Frontend, history, matching, internal workers, Web UI, and schema jobs are healthy.

### Stage 4 — Validate native server behavior

Use the Temporal CLI or supported API to create a test namespace, start a test workflow, list workflow visibility records, and verify a worker can poll a task queue.

**Testable outcome:** A workflow completes after a worker restart, and its history and visibility records remain available.

### Stage 5 — Add platform integrations

Only after the server is healthy, connect the platform operator and Worker Controller. Verify namespace reconciliation, direct frontend connections, generated worker deployments, and the selected authentication model against the self-hosted endpoint.

**Smoke outcome:** A trusted in-cluster consumer can use a `TemporalNamespace` and `TemporalWorker` through the direct Temporal frontend address. Authentication is not enabled yet, so this does not provide tenant isolation.

### Stage 6 — Production readiness

Test upgrade, rollback, database restore, pod disruption, certificate rotation, retention behavior, and Web UI access. Record operational ownership and alerts.

**Testable outcome:** The platform has a signed-off runbook and recovery evidence before production workloads are onboarded.

## What should we monitor?

At minimum:

- Frontend, history, matching, and internal worker health.
- RPC failures and frontend latency.
- Task-queue and schedule-to-start latency.
- Workflow failures, timeouts, and backlog.
- Persistence errors and database connection saturation.
- Database storage growth, schema-job status, and backup success.
- Pod restarts, resource saturation, and rollout status.
- Tailscale access failures and frontend authentication failures.
- TLS/JWT authentication failures when enabled.

## What should we explicitly not build yet?

- A Temporal Cloud compatibility layer.
- Automatic worker credential generation in Temporal Server itself.
- Elasticsearch/OpenSearch before PostgreSQL visibility limits are demonstrated.
- Public frontend access.
- A general tenant automation integration in `noperator`.

## Is there any external references to this documentation?

- [Temporal Helm chart](https://github.com/temporalio/helm-charts) — official Kubernetes chart and persistence configuration.
- [Temporal architecture](https://github.com/temporalio/temporal/blob/main/docs/architecture/README.md) — server components and workflow execution model.
- [Temporal self-hosted security](https://docs.temporal.io/self-hosted-guide/security) — TLS, authorization, and claims.
- [Temporal CLI](https://docs.temporal.io/cli) — administrative and workflow verification commands.
