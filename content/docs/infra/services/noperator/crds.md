---

title: "Custom Resource Definitions"
description: "This document describes the two custom resources provided by tenant-controller. It covers their primary use cases, copyable examples, additional use cases, and"
---

## What am I looking at?

This document describes the two custom resources provided by `tenant-controller`.
It covers their primary use cases, copyable examples, additional use cases, and
important schema constraints.

## Contents

- [What am I looking at?](#what-am-i-looking-at)
- [What is a Tenant used for?](#what-is-a-tenant-used-for)
  - [What other Tenant use cases are available?](#what-other-tenant-use-cases-are-available)
  - [Which Tenant fields have important constraints?](#which-tenant-fields-have-important-constraints)
- [What is a TemporalCloudNamespace used for?](#what-is-a-temporalcloudnamespace-used-for)
  - [What other TemporalCloudNamespace use cases are available?](#what-other-temporalcloudnamespace-use-cases-are-available)
  - [Which TemporalCloudNamespace fields have important constraints?](#which-temporalcloudnamespace-fields-have-important-constraints)
- [Is there any external references to this documentation?](#is-there-any-external-references-to-this-documentation)

## What is a Tenant used for?

Use a `Tenant` to define a tenant's GitOps sources and environments. The
operator creates the namespaces and Argo CD resources needed to deploy the
tenant's applications. It can also configure repository credentials, image-pull
credentials, extensions, and Temporal Cloud namespaces.

```yaml
apiVersion: noperator.nori-cloud.io/v1alpha1
kind: Tenant
# Scope: Namespaced
# Resource: tenants.noperator.nori-cloud.io
# Required fields: spec.git, spec.environments
metadata:
  name: norriswu0-test
  namespace: noperator
spec:
  git:
    - repoURL: https://github.com/norriswu0/apps.git
      revision: main
      credentials:
        # Values can use a $secretName:key reference.
        type: githubApp
        githubAppId: "12345"
        githubAppPrivateKey: $norriswu0-github-app:privateKey
  environments:
    - dev
    - prod
  extensions:
    - name: cnpg
    - name: certManager
  imagePullSecrets:
    - registry: ghcr.io
      username: $ghcr-cred:username
      password: $ghcr-cred:password
```

### What other Tenant use cases are available?

- Configure multiple Git repositories for a tenant's application sources.
- Use GitHub App or personal access token repository credentials.
- Enable extension-specific resources through the extension registry.
- Add extra resource kinds to the tenant's Argo CD `AppProject` allowlist.
- Configure Temporal Cloud namespaces for every tenant environment.
- Preserve generated resources when deleting the `Tenant`.

### Which Tenant fields have important constraints?

| Field                         | Type             | Constraint or default                         |
| ----------------------------- | ---------------- | --------------------------------------------- |
| `git`                         | `GitRepo[]`      | Minimum one item.                             |
| `git[].revision`              | `string`         | Defaults to `main`.                           |
| `git[].credentials.type`      | `string`         | `githubApp` or `pat`.                         |
| `destination.server`          | `string`         | Defaults to `https://kubernetes.default.svc`. |
| `environments`                | `string[]`       | Minimum one item.                             |
| `extensions`                  | `ExtensionRef[]` | Names must exist in the extension registry.   |
| `preserveResourcesOnDeletion` | `boolean`        | Defaults to `false`.                          |
| `temporal.endpoint`           | `string`         | Defaults to `saas-api.tmprl.cloud:443`.       |
| `temporal.regions`            | `string[]`       | Minimum one item when Temporal is enabled.    |
| `temporal.retentionDays`      | `int32`          | Minimum `1`; defaults to `7`.                 |

The `Tenant` status contains reconciliation conditions and the resource
`observedGeneration`.

## What is a TemporalCloudNamespace used for?

Use a `TemporalCloudNamespace` to provision and manage one namespace in
Temporal Cloud. The API key is referenced from a Secret in the same Kubernetes
namespace; the resource stores configuration and does not embed the key value.

```yaml
apiVersion: noperator.nori-cloud.io/v1alpha1
kind: TemporalCloudNamespace
# Scope: Namespaced
# Resource: temporalcloudnamespaces.noperator.nori-cloud.io
# Required fields: spec.apiKeySecretRef, spec.allowedAccountId, spec.regions
metadata:
  name: norriswu0-dev
  namespace: noperator
spec:
  # Same-namespace Secret containing the Temporal Cloud Ops API key.
  apiKeySecretRef:
    name: temporal-cloud-credentials
    key: api-key
  endpoint: saas-api.tmprl.cloud:443
  allowInsecure: false
  allowedAccountId: my-temporalcloud-account-id
  regions:
    - aws-us-east-1
  retentionDays: 7
```

### What other TemporalCloudNamespace use cases are available?

- Manage a Temporal Cloud namespace independently of a `Tenant`.
- Configure more than one Temporal Cloud region for a namespace.
- Set a custom namespace retention period.
- Restrict operations to a specific Temporal Cloud account.
- Connect to a custom Cloud Ops API endpoint.

### Which TemporalCloudNamespace fields have important constraints?

| Field             | Type                | Constraint or default                   |
| ----------------- | ------------------- | --------------------------------------- |
| `apiKeySecretRef` | `SecretKeySelector` | Secret name and key are required.       |
| `endpoint`        | `string`            | Defaults to `saas-api.tmprl.cloud:443`. |
| `regions`         | `string[]`          | Minimum one item.                       |
| `retentionDays`   | `int32`             | Minimum `1`; defaults to `7`.           |

The `TemporalCloudNamespace` status contains conditions and the external
Temporal Cloud identifier in `status.externalId`.

## Is there any external references to this documentation?

- `tenant-controller/api/v1alpha1` — defines the API types and validation markers.
- `tenant-controller/config/crd/bases` — contains the generated Kubernetes CRD manifests.
- `tenant-controller/config/samples/noperator_v1alpha1_tenant.yaml` — shows a sample Tenant resource.
- `tenant-controller/config/samples/noperator_v1alpha1_temporalcloudnamespace.yaml` — shows a sample Temporal Cloud namespace resource.

After changing API types or Kubebuilder markers, regenerate the manifests with:

```sh
cd tenant-controller
make manifests generate
```
