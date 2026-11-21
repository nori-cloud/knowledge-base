---

title: Knowledge-base GitHub proxy design
description: Design for a read-only, multi-repository GitHub proxy with webhook-first synchronization, caching, and semantic search.
---

## What am I looking at?

This document describes a server-side GitHub integration for the knowledge base. It covers read-only repository access, cache synchronization, embeddings, and future graph queries. Write operations are intentionally deferred.

## Why do we need a GitHub proxy?

The proxy keeps GitHub credentials out of the browser and provides one stable API for the web application, search services, and agents. GitHub remains the source of truth; the proxy maintains a searchable local projection.

## How will webhook events reach the Temporal worker?

A small listener service will receive and verify GitHub webhooks. It will publish normalized repository events to NATS JetStream. A NATS-to-Temporal bridge will start or signal a Temporal workflow. The Temporal worker owns both synchronization and embedding activities.

This keeps the webhook endpoint fast and allows events to be replayed if the Temporal worker is temporarily unavailable.

```text
GitHub webhook
  → webhook listener
  → NATS JetStream
  → NATS-to-Temporal bridge
  → Temporal workflow
  → Temporal worker
  → PostgreSQL projection
```

The listener should not contain document or GitHub business logic. Its responsibilities are signature verification, event normalization, and publishing. The Temporal workflow coordinates GitHub reads, document updates, polling reconciliation, and embedding activities.

## How will the proxy support multiple repositories?

The service will track GitHub installations, repositories, branches, permissions, and synchronization state. Requests will identify the target repository and branch.

The repository model should include:

- GitHub installation
- Repository owner and name
- Default branch
- Last synchronized commit SHA
- Webhook status
- Polling status
- Access permissions

**Testable outcome:** An authenticated request can be authorized against one selected repository.

## How will the proxy read documents?

The initial read-only API will support documents, metadata, history, diffs, search, and synchronization status. The GitHub App should receive only the permissions needed to read the selected repositories and receive webhooks.

Document modification is deferred. If writes are added later, they should use a separately authorized branch and pull-request workflow rather than direct changes to the default branch.

**Testable outcome:** An authenticated request retrieves a document with its repository, path, and commit SHA.

## What will the cache store?

The cache will store repository metadata, commits, files, paths, frontmatter, document versions, links, and synchronization cursors. Cache entries should be versioned by repository, branch, path, and commit SHA.

The webhook listener will publish targeted synchronization events. A Temporal workflow will also run polling reconciliation for missed webhooks and stale repositories, publishing the same event type through NATS JetStream when a sync is required.

**Testable outcome:** The local projection converges to a known GitHub commit SHA whether synchronization starts from a webhook or polling.

## How will embeddings and graph data work?

PostgreSQL will be the initial system of record, with `pgvector` for embeddings. The database will store:

- Source repository
- Document path
- Commit SHA
- Document version
- Text chunks
- Embeddings
- Document relationships

Use relational links first. Add a graph database or graph projection only after graph traversal becomes a demonstrated requirement.

**Testable outcome:** Document retrieval returns the source document, repository, path, and commit SHA.

## How will reliability be handled?

The service will use:

- Idempotent webhook handling
- Durable NATS JetStream events
- Idempotent Temporal workflows and activities
- Temporal retry policies
- GitHub rate-limit awareness
- Audit logs
- Synchronization metrics
- Protection against duplicate and out-of-order events

**Testable outcome:** Replayed or out-of-order events do not corrupt the local projection.

## Which decisions are still open?

- Should GitHub App access cover an organization, selected repositories, or user-owned repositories?
- When should document modification be introduced, and who may authorize it?
- Should we start with PostgreSQL and `pgvector`, or introduce a graph database immediately?
- Should clients receive real-time invalidation through SSE/WebSockets, or query synchronization status?

## What is the recommended first implementation?

Use a standalone TypeScript service or a Next.js server module with a small webhook listener, NATS JetStream, a NATS-to-Temporal bridge, a Temporal worker for sync and embeddings, PostgreSQL, and `pgvector`. Start with read-only GitHub permissions. Treat GitHub as the source of truth, cache by commit SHA, use webhook events for fast synchronization, and poll as reconciliation. Add a graph projection and write workflow later if they become necessary.

## Is there any external references to this documentation?

- [GitHub Apps documentation](https://docs.github.com/en/apps)
- [GitHub Webhooks documentation](https://docs.github.com/en/webhooks)
- [NATS JetStream documentation](https://docs.nats.io/nats-concepts/jetstream)
- [Temporal documentation](https://docs.temporal.io/)
- [pgvector](https://github.com/pgvector/pgvector)
