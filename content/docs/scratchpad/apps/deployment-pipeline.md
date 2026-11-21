---

title: "Deployment Pipeline"
description: "feature branch → dev → main"
---

## Strategy

`feature branch → dev → main`

Two protected branches: `dev` (integration) and `main` (production). Each maps to a kustomize overlay in `nori-cloud/apps`.

| Branch | Overlay            | K8s Namespace     | ArgoCD AppSet     |
| ------ | ------------------ | ----------------- | ----------------- |
| `dev`  | `*/overlays/dev/`  | `nori-cloud-dev`  | `nori-cloud-dev`  |
| `main` | `*/overlays/prod/` | `nori-cloud-prod` | `nori-cloud-prod` |

## Flow

```
feature ──PR──▶ dev ──PR──▶ main
    │              │             │
    ▼              ▼             ▼
  CI check    CD (build)    Promote tags
  (no push)     │            (no build)
                ▼             │
           push image         ▼
           to ghcr.io    copy dev newTag
           update dev     to prod overlay
           overlay
                │
                ▼
          ArgoCD syncs
          nori-cloud-dev
```

## Workflows (in `nori-cloud/factory`)

### CI — PR to `dev`

**Trigger:** `pull_request: [dev]`

**`ci.yaml`**

1. `sanity-check.yaml` — lint, type-check, test
2. `build-changed-image.yaml` — docker build only (no push), validates Dockerfiles compile

### CD — Push to `dev`

**Trigger:** `push: [dev]`, paths: `apps/**`, `packages/**`

**`cd.yaml`**

1. `detect-changes` — finds changed apps using git diff `HEAD^1...HEAD`
2. Per changed app (matrix):
   - `build-image.yaml` builds docker image, pushes to `ghcr.io/nori-cloud/<app>:<short-sha>`
   - `gitops-update-overlay.yaml` clones `nori-cloud/apps`, updates `apps/<app>/overlays/dev/kustomization.yaml` → `newTag: <short-sha>`, commits and pushes
3. ArgoCD ApplicationSet detects change in dev overlay, syncs to `nori-cloud-dev`

### Promote — Push to `main`

**Trigger:** `push: [main]`, paths: `apps/**`, `packages/**`

**`prod-promote.yaml`**

1. `detect-changes` — finds changed apps
2. For each changed app with `deploy: true`:
   - Reads `newTag` from `apps/<app>/overlays/dev/kustomization.yaml`
   - Writes same tag to `apps/<app>/overlays/prod/kustomization.yaml`
   - Commits and pushes to `nori-cloud/apps`
3. ArgoCD ApplicationSet detects change in prod overlay, syncs to `nori-cloud-prod`

### Note

Production uses the **same image** that was built and tested on dev (tag promotion, not rebuild).

## Development Workflow

```sh
# 1. Create feature branch from dev
git checkout dev
git pull
git checkout -b feat/my-feature

# 2. Develop and push
git push -u origin feat/my-feature

# 3. Open PR: feat/my-feature → dev
#    - CI runs: sanity check + build check
#    - Review and merge

# 4. Merge to dev triggers CD
#    - Builds image, deploys to nori-cloud-dev
#    - Verify in dev environment

# 5. Open PR: dev → main
#    - Review and merge

# 6. Merge to main triggers promote
#    - Copies dev image tags to prod overlay
#    - ArgoCD deploys to nori-cloud-prod
```
