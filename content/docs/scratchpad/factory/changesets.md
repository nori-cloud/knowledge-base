---

title: "Changesets Guide"
description: "Changesets manages versioning and changelogs for this monorepo. When you make changes that should be released, you create a \"changeset\" describing what changed."
---

Changesets manages versioning and changelogs for this monorepo. When you make changes that should be released, you create a "changeset" describing what changed.

## Quick Start

```bash
# After making changes, create a changeset
pnpm changeset
```

## Creating a Changeset

### 1. Run the command

```bash
pnpm changeset
```

### 2. Select packages

```
🦋  Which packages would you like to include?
◯ changed packages
  ◯ @nori-cloud/server
  ◉ to-specify
```

Use arrow keys and space to select, enter to confirm.

### 3. Select bump type

```
🦋  Which packages should have a major bump?
◯ all packages
  ◯ to-specify

🦋  Which packages should have a minor bump?
◯ all packages
  ◉ to-specify
```

- **major** - breaking changes (1.0.0 → 2.0.0)
- **minor** - new features (1.0.0 → 1.1.0)
- **patch** - bug fixes (1.0.0 → 1.0.1)

### 4. Write summary

```
🦋  Please enter a summary for this change (this will be in the changelog).
🦋    (submit empty line to open external editor)
🦋  Summary › add pokemon rewards system with weighted random selection
```

### 5. Output

Creates a file like `.changeset/fuzzy-pandas-dance.md`:

```markdown
---

## "to-specify": minor

add pokemon rewards system with weighted random selection
```

## Release Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Create         │     │  Merge to        │     │  Merge Release  │
│  Changeset      │────▶│  main            │────▶│  PR             │
│  (pnpm changeset)     │                  │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                │                        │
                                ▼                        ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │  Release PR      │     │  Creates tag    │
                        │  auto-created    │     │  to-specify-v1.1.0
                        │  with changelog  │     │  ──────────────▶│ Docker build
                        └──────────────────┘     └─────────────────┘
```

### Step 1: Push changesets to main

When you merge a PR with changesets to `main`, the release workflow:

- Detects pending changesets
- Opens a "Release" PR with:
  - Version bumps in `package.json`
  - Updated `CHANGELOG.md`
  - Consumed changeset files removed

### Step 2: Release PR example

**PR Title:** `chore: release`

**Changed files:**

```diff
# apps/to-specify/package.json
- "version": "0.1.0",
+ "version": "0.2.0",

# apps/to-specify/CHANGELOG.md
+ ## 0.2.0
+
+ ### Minor Changes
+
+ - add pokemon rewards system with weighted random selection
```

### Step 3: Merge triggers build

Merging the Release PR:

1. Creates GitHub Release with changelog
2. Creates git tag: `to-specify-v0.2.0`
3. Tag triggers `.github/workflows/to-specify.yaml`
4. Docker image pushed to `ghcr.io/nori-cloud/to-specify:0.2.0`

## Commands Reference

| Command                  | Description                                           |
| ------------------------ | ----------------------------------------------------- |
| `pnpm changeset`         | Create a new changeset                                |
| `pnpm changeset status`  | Check pending changesets                              |
| `pnpm version`           | Apply changesets (CI does this)                       |
| `pnpm changeset --empty` | Create empty changeset (for PRs with no version bump) |

## Examples

### Feature addition (minor)

```bash
$ pnpm changeset
# Select: to-specify
# Bump: minor
# Summary: add dark mode toggle to settings
```

Creates `.changeset/bright-wolves-glow.md`:

```markdown
---

## "to-specify": minor

add dark mode toggle to settings
```

### Bug fix (patch)

```bash
$ pnpm changeset
# Select: to-specify
# Bump: patch
# Summary: fix auth redirect loop on expired session
```

Creates `.changeset/calm-tigers-rest.md`:

```markdown
---

## "to-specify": patch

fix auth redirect loop on expired session
```

### Breaking change (major)

```bash
$ pnpm changeset
# Select: to-specify
# Bump: major
# Summary: redesign API routes, remove legacy endpoints
```

Creates `.changeset/angry-bears-roar.md`:

```markdown
---

## "to-specify": major

redesign API routes, remove legacy endpoints
```

### Multiple packages

```bash
$ pnpm changeset
# Select: to-specify, @nori-cloud/server
# Bump to-specify: minor
# Bump server: patch
# Summary: add shared auth utilities
```

Creates `.changeset/happy-cats-purr.md`:

```markdown
---

"to-specify": minor
"@nori-cloud/server": patch
---

add shared auth utilities
```

## Tips

- Create changesets as you work, not at the end
- One changeset per logical change (can span multiple commits)
- Multiple changesets in one PR are fine
- Empty changesets (`pnpm changeset --empty`) for docs/CI changes
- Changesets are consumed (deleted) when Release PR merges
