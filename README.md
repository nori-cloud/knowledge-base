# Knowledge Base

## What am I looking at?

A Fumadocs site built with Next.js, with DeepSeek-powered documentation chat.
It replaces the `docs` application in `nori-cloud/apps`, using the existing
hostnames and port 4321.

## How do I run it?

Install Node.js 22, the pnpm version in `package.json`, and Infisical
(`mise install` installs the configured CLI). Sign in to the self-hosted
Infisical instance, then run:

```sh
infisical login --domain https://infisical.hoki-sole.ts.net/api
pnpm install --frozen-lockfile --ignore-scripts
pnpm dev
```

Open <http://localhost:3000/docs>. Development injects secrets from
`dev:/knowledge-base`; no `.env.local` is needed. `DEEPSEEK_API_KEY` is required
for chat; optional `DEEPSEEK_MODEL` overrides the `deepseek-v4-flash` default.

Run `pnpm sanity` for lint, types, and a production build. These checks do not
need secrets.

## How is it delivered?

The app matrix lives in [`.github/apps.json`](.github/apps.json). Shared actions
are pinned to reviewed commit `a2e14326bca943a3b1cd129e3fa061d73616a806`.

| Workflow     | Result                                                                       |
| ------------ | ---------------------------------------------------------------------------- |
| CI           | PR checks and image build without publishing                                 |
| CD           | Checks, SHA-tagged image publication, dev overlay and `docs-dev` tag updates |
| Prod Promote | Select `docs`; reuse an existing image, update prod, tag, and release        |

CD compares against its last successful push run, including missed deliveries.
Root files and `.github/` changes rebuild the app, as do changes to its listed
source directories. CD and promotion share a concurrency group; other
repositories writing to GitOps still require coordination.

For production promotion, run the workflow from `main`. Leave `sha` blank to
follow `docs-dev`, or supply a full commit SHA already published to GHCR.
Start with `dry-run`; this still reads GHCR and the GitOps repository.

## What must be configured before cutover?

- Allow this repository's workflows to use the private `nori-cloud/actions`.
- Add `GITOPS_APP_ID` and `GITOPS_APP_PRIVATE_KEY` as repository or accessible
  organization secrets. The App needs Contents write access to `nori-cloud/apps`.
- Grant this repository Actions write access to the existing GHCR `docs`
  package, and allow `GITHUB_TOKEN` packages write and environment-tag updates.
- Disable the old docs repository's delivery and promotion workflows before
  enabling this pipeline. Both publish `ghcr.io/nori-cloud/docs` and update the
  same overlays.
- Prepare the GitOps changes under `docs/base`, preserving both current image
  pins until the first successful delivery. Publish a Knowledge Base image,
  then apply its matching GitOps configuration and image pin together.
- Put `DEEPSEEK_API_KEY` at `/knowledge-base` in both Infisical environments.
  The dedicated `docs-secret-store` supplies `docs-secret` through External
  Secrets. Its endpoint is `https://infisical.hoki-sole.ts.net`; confirm the
  operator can resolve and reach this tailnet address.
- Reuse the existing `infisical-universal-auth` Secret in each environment
  namespace (`client_id` and `client_secret`). Confirm that identity can read
  `/knowledge-base`. The store's `secretsPath` is not an access-control boundary;
  the shared identity retains its existing permissions.
  Restart application pods after rotating the DeepSeek key.
- Keep the existing GHCR pull credentials and Argo CD applications available.
  Verify the dev rollout before manually promoting production.

Only runtime pods receive the API key. Docker excludes local environment files
and Infisical configuration; builds and CI do not fetch application secrets.

## Is there any external references to this documentation?

- [CI/CD setup](https://github.com/nori-cloud/actions/blob/main/docs/set-up-cicd.md)
- [GitOps setup](https://github.com/nori-cloud/actions/blob/main/docs/set-up-gitops-apps.md)
- [Fumadocs](https://fumadocs.dev/docs)
