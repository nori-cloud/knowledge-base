---

title: "Architecture"
description: "A high-level view of how users, the web UI, the Kubernetes operator, Argo CD, and Temporal Cloud work together. The Kubernetes API server is the system's"
---

## What am I looking at?

A high-level view of how users, the web UI, the Kubernetes operator, Argo CD,
and Temporal Cloud work together. The Kubernetes API server is the system's
source of truth: the UI reads tenant state from it, and the controllers store
their desired and observed resources there.

```mermaid
flowchart TB
    Users["Users"] --> UI["noperator UI\n(read-only dashboard)"]

    subgraph Cluster["Kubernetes cluster"]
        API["Kubernetes API server\n(source of truth)"]
        TenantCR["Tenant CRs"]
        Controller["tenant-controller"]
        Derived["Generated resources\nNamespaces · AppProject · ApplicationSets\nSecrets · ServiceAccounts · TemporalCloudNamespaces"]

        TenantCR --> API
        API -->|"watch Tenant CRs"| Controller
        Controller -->|"render and apply"| Derived
        Derived -->|"stored in"| API
        Controller -->|"update status and emit events"| API

        API -->|"read tenants, generated resources, status, and events"| UI
    end

    subgraph Argo["Argo CD"]
        Applications["Applications"]
        AppController["Argo CD controllers"]
    end

    API -->|"watch AppProjects and ApplicationSets"| AppController
    AppController --> Applications
    Applications -->|"pull manifests"| Git["Git repositories"]
    Applications -->|"deploy into generated namespaces"| Workloads["Tenant workloads"]

    TemporalController["Temporal namespace controller"]
    API -->|"watch TemporalCloudNamespaces"| TemporalController
    TemporalController -->|"create and manage namespaces"| TemporalCloud["Temporal Cloud"]

    Helm["Helm chart"] -.->|"installs cluster components"| Cluster
```

## How are tenants turned into workloads?

A user creates a `Tenant` custom resource. `tenant-controller` watches it,
resolves the extension registry, and applies the generated Kubernetes and Argo
CD resources. Argo CD then uses the generated `ApplicationSet` resources and
Git repositories to create and deploy tenant applications.

## Where does the web UI get its data?

The UI reads the `Tenant` resources and their generated resources from the
Kubernetes API server. This includes tenant status, Argo CD resources,
namespaces, Secrets with masked values, ServiceAccounts, and Kubernetes Events.
The UI does not deploy or reconcile resources.

## How is Temporal Cloud integrated?

When Temporal support is enabled on a `Tenant`, the operator creates one
`TemporalCloudNamespace` resource per environment. A Temporal namespace
controller watches those resources and reconciles them with Temporal Cloud.

## How is the system installed?

The Helm chart installs the controller, CRDs, RBAC, optional UI, extension
registry, and supporting Kubernetes resources. Optional chart integrations
include Prometheus monitoring, cert-manager certificates, and network policies.
