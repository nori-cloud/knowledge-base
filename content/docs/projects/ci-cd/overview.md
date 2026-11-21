---

title: "You Don't Need a CD Pipeline — Just Move a Git Tag"
description: "We went through three deployment strategies before landing on the right one. The first idea is rarely the right one, and that's fine."
---

We went through three deployment strategies before landing on the right one. The first idea is rarely the right one, and that's fine.

## How We Got Here

**Phase 1: The flat single-env deploy.** Every merge to `main` built an image, tagged it with `:latest`, and a `sed` one-liner shoved it into a flat `deployment.yaml` in our `nori-cloud/lab` repo. One environment, one branch, one image tag. Simple. But also: no dev environment, no staging, no way to test before prod. The `:latest` tag meant nobody could tell what was actually running without SSH-ing into the cluster.

**Phase 2: The dev branch attempt.** We created a `dev` branch. PRs merged to `dev` → auto-deploy to a dev overlay. Merge `dev` to `main` → promote to prod. We built out the kustomize overlays (`apps/outpost/overlays/{dev,prod}/`), wired up the CI/CD triggers, and were about to push it live.

Then we stopped and asked: _do we actually want branch-based promotion?_

The answer was no. Here's why:

- **Dev branch drift.** Two features merged to dev at different times. One passed UAT, the other didn't. Now you can't promote either independently — they're coupled by the branch.
- **Promoting everything at once.** Merge dev to main, and every app on dev rides along to prod whether it's ready or not.
- **No release history.** What was outpost running three deployments ago? The branch history tells you about code changes, not deployment decisions.
- **Branch redundancy.** If tags handle the deployment pointer, why maintain a whole branch for the same purpose?

So we threw away the dev branch, deleted it from remote, and started over. Enter phase 3.

**Phase 3: Git-tag-pointer deployment.** Tags as mutable pointers, images as immutable SHAs, promotion as explicit human intent. This is what we shipped.

Here's the full design, decision by decision, edge case by edge case.

## The Core Idea: Git Tags as Deployment Pointers

Every deployable app gets two tags:

```
outpost-dev   → commit abc1234 → image :abc1234 → dev overlay
outpost-prod  → commit abc0000 → image :abc0000 → prod overlay
```

These are **mutable pointers**. When you build a new image, the dev tag moves to the new commit SHA. When you promote, the prod tag catches up. The overlay kustomization in our GitOps repo references the full commit SHA as `newTag`. Argo CD sees the change and syncs.

That's the whole mental model. Tags move. Overlays update. Argo CD syncs. Done.

Why not use container tags like `:latest` or `:outpost-dev`? Because mutable container tags lie to you. `:latest` means "whatever was pushed last" — could be five minutes ago, could be last Tuesday. Commit SHAs never lie.

### Why Full SHAs for Automation

We push two image tags:

```
ghcr.io/nori-cloud/outpost:abc1234          ← short, for humans
ghcr.io/nori-cloud/outpost:abc1234def5678   ← full, for automation
```

The short one is for `docker pull` from your terminal. The full one is what our promotion workflow references. Here's why: if we ever change how we shorten SHAs (7 chars → 8 chars, or whatever), the promotion path breaks because it was looking for the old shortcut format. Full SHA means zero coupling to formatting decisions.

### Chrono Tags for Free Audit Trail

Every time a tag moves, we stamp a companion:

```
outpost-dev → abc1234 → also creates outpost-dev-20260801143022
```

`git tag -l 'outpost-dev-*' | sort` gives you a complete release history. No external tooling, no database, just git.

## Walk Through a Release

Here's the full path from PR to production, step by step.

### 1. PR Opens → CI Validates

A contributor opens a PR against `main`. `ci.yaml` fires:

```
sanity-check → pnpm turbo lint typecheck build
detect-changes → diff against origin/main → finds outpost changed
build → docker build (push: false) → populates GHA layer cache
```

No images pushed to GHCR. The Docker build is a dry-run that validates the Dockerfile works and warms the layer cache. CD will thank us later.

Why not push the image here? Because a PR might get five CI runs before merge. That's four wasted images in GHCR. The layer cache is enough.

### 2. Merge to Main → Auto-Deploy to Dev

`cd.yaml` triggers on push to `main`, paths filtered to `apps/**` and `packages/**`:

```
detect-changes → git diff HEAD^1...HEAD → outpost changed
  ↓
build → docker build (push: true) → cache hit from CI → seconds, not minutes
  ↓
deploy → two actions, one job:
  ├── gitops-update-overlay: updates outpost/overlays/dev/kustomization.yaml
  └── move-tag: git tag -f outpost-dev + outpost-dev-20260801143022
```

The build is fast because the GHA layer cache was primed by CI. Same `cache-from/cache-to` scope in `build-image.yaml`. No retag tricks, no image mutation — just a plain Docker build that hits the cache.

The deploy job runs both the overlay update and the tag move in one shot. If the overlay push fails, the tag doesn't move. No orphaned state.

Argo CD detects the overlay change. Dev is live.

### 3. UAT Happens

Someone tests on dev. It works. They're ready to promote.

### 4. One Click to Prod

```
GitHub → Actions → Prod Promote → Run workflow

Inputs:
  ☑ outpost
  ☐ vesta
  ☐ visa
  ☐ ui
  sha:         (blank — follows outpost-dev)
  description: "fix: chat scroll position"
  dry-run:     (unchecked)
```

Check any combination of apps. Each ticked app gets its own matrix job.

The workflow does two jobs:

**prepare** — resolves what to promote:

```
For each ticked app:
  → resolve <app>-dev tag → commit SHA (^{} to peel annotated tags)
  → validate image exists in GHCR (docker manifest inspect)
  → fail fast if image missing
```

**promote** — matrix job per app:

```
promote (outpost):
  ├── gitops-update-overlay: sed outpost/overlays/prod/kustomization.yaml
  ├── move-tag: git tag -f outpost-prod + chrono tag
  └── gh release create: GitHub Release with image URLs in notes
```

Argo CD syncs. Prod is live. GitHub has a release with the exact images that were promoted.

### 5. Rollback (When Things Go Wrong)

Same workflow, different inputs:

```
☑ outpost
sha: abc0000   ← old known-good SHA
```

The workflow resolves the manual SHA, validates it exists in GHCR, moves the tag, and updates the overlay. Argo CD rolls back. No special rollback pipeline needed.

### 6. Dry-Run Mode

Check the overlay diff before you commit:

```
☑ outpost
dry-run: ☑ checked
```

Outputs:

```
DRY-RUN: move outpost-prod → abc1234
DRY-RUN: would commit to nori-cloud/apps
Overlay diff:
-  newTag: abc0000
+  newTag: abc1234
```

Same validation, no changes pushed. Good for pre-promotion sanity or showing a teammate what's about to happen.

## Wiring: What Talks to What

```
factory/                           apps/ (gitops repo)
┌─────────────────────────┐        ┌──────────────────────────────┐
│ workflow                 │        │ overlay kustomization         │
│                          │        │                              │
│ ci.yaml       PR CI     │        │ outpost/overlays/dev/        │
│ cd.yaml       push→main │ ────→  │   kustomization.yaml         │
│ prod-promote  manual    │  push  │   newTag: abc1234def5678...   │
│                          │ commit │                              │
│ build-image   reusable  │        │ outpost/overlays/prod/       │
│                          │        │   newTag: abc0000...         │
│ git tags:                │        └──────────────────────────────┘
│   outpost-dev            │                    │
│   outpost-prod           │              Argo CD watches
│   vesta-dev              │              this repo, syncs on
│   vesta-prod             │              commit change
└─────────────────────────┘
```

Four composite actions glue it together:

| Action                  | One-liner                                      |
| ----------------------- | ---------------------------------------------- |
| `detect-changes`        | Git diff → JSON matrix of changed apps         |
| `gitops-update-overlay` | Clone apps repo → `sed newTag` → commit → push |
| `move-tag`              | `git tag -f` + chrono stamp → push             |
| `setup`                 | pnpm + Node.js                                 |

All four are called with `uses:` from within `runs-on` jobs. No reusable workflow output-passing gymnastics. No artifact upload/download workarounds.

## Edge Cases Worth Knowing

### GHA cache is best-effort

If CI never ran (first push to a repo, cache evicted), CD does a full build. The cache is an optimization, not a dependency. Nothing breaks without it.

### Two people promoting at once

Both run `git tag -f outpost-prod` and force-push. Last push wins. For a small team, this is fine — just communicate.

### Image GC vs. Rollback

If your GHCR retention is 30 days and you try to roll back to a 31-day-old SHA, `docker manifest inspect` fails and the promotion is blocked. Set retention to match your recovery window.

### New app onboarding checklist

Adding a deployable app requires updating three places:

1. `detect-changes/action.yaml` — add to app register with narrowed package paths
2. `prod-promote.yaml` — add boolean input + env check line in prepare script
3. `nori-cloud/apps` — create `overlays/{dev,prod}/` with kustomization.yaml

Infrequent event. Three places by design for explicitness, not DRY.

### Shared package changes cascade

Each app has narrowed package paths matching its actual dependencies. A `packages/vesta-client` change triggers outpost + vesta but not visa or ui. A `packages/ui` change triggers outpost + visa. This keeps rebuilds scoped to only the apps that actually consume the changed package.

### Annotated tags and commit resolution

Tags with descriptions become annotated tag objects with their own SHA. `git rev-parse` returns the tag object SHA, not the commit SHA. Our promotion workflow uses `refs/tags/<app>-dev^{}` to peel annotated tags to their underlying commit. Forgetting this means the workflow looks for a container image tagged with the tag object SHA — which doesn't exist.

### Workflow permissions on composite actions

Composite actions calling external actions (like `actions/create-github-app-token`) can't access `secrets` from `uses:` steps. They must receive secret values as inputs. Our `gitops-update-overlay` action takes `app-id` and `private-key` as inputs, passed explicitly by the caller workflows. Same pattern applies to `contents: read` — jobs using `actions/checkout` must explicitly declare it alongside any other permissions.

### Docker metadata `sha-` prefix

`docker/metadata-action`'s `type=sha` defaults to `prefix=sha-`, producing tags like `sha-abc1234` instead of `abc1234`. Our `build-image.yaml` uses `type=sha,format=short,prefix=` and `type=sha,prefix=` to get bare SHA tags. Easy to miss — if your image tags have an unexpected prefix, check the metadata-action config.

### Tag push rejected with `workflows` permission error

GitHub has a known bug where `GITHUB_TOKEN` refuses to push a tag pointing to a commit whose `.github/workflows/` content differs from the latest commit on any branch. This affects `workflow_dispatch`-triggered tag pushes (like prod-promote) after workflow files have been modified. `cd.yaml` is unaffected because it pushes tags to HEAD where workflow content matches by definition. The workaround: push tags using a GitHub App or PAT with `workflows` permission, or ensure the tag's commit is at HEAD where workflow content is identical.

## What We Skipped (On Purpose)

- **No `:latest` container tag.** Mutable image tags are a lie. SHA tags are immutable. The git tags are the only mutable pointers, and they live in version control.
- **No branch-based CD.** `main` is the only branch. Tags handle promotion. One less branch to maintain.
- **No artifact-based matrix aggregation.** We tried it. Removed it. Each promote matrix job is self-contained: resolve → overlay → tag.
- **No image mutation or retagging in CD.** CI does the build, deposits layers in the GHA cache. CD reuses them. Clean, simple, no `docker pull` + `docker tag` magic.

## The Payoff

Every deployment decision is a git tag. `git tag -l '*-prod'` tells you what's in production. `git tag -l 'outpost-dev-*' | sort` tells you the dev release history. The GitOps repo tracks every overlay update in its commit log.

A PR merge builds and deploys to dev. A button click promotes to prod. A different SHA in the same button rolls back. No YAML-driven state machine, no external deployment tool. Just git, Docker, and Argo CD.
