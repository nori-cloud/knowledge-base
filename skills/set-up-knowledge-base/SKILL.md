---

name: set-up-knowledge-base
description: Structure a repository's docs/ folder so Knowledge Base can load and publish it, including the landing page, frontmatter, relative links, and a convention check.
---

## What am I looking at?

Prepare a source repository for [Knowledge Base](https://github.com/nori-cloud/knowledge-base).
The loader publishes everything under the repository's `docs/` folder and nothing else.
The convention below is the whole contract; the repository needs no manifest.

## What layout does the loader expect?

```text
<repo>/
└── docs/
    ├── index.md        # landing page for the mount (required)
    ├── meta.json       # optional: section title and page order
    ├── guide.md
    └── topic/index.md
```

- Pages are `.md` only. Remote content never runs MDX.
- Only `.md` pages and `meta.json` belong in `docs/`. Other files fail the check.
- `README.md`, `AGENTS.md`, and `SKILL.md` keep their own jobs. They are not published,
  but may link to pages in `docs/`.
- Do not add frontmatter to `AGENTS.md` or `SKILL.md`; other tools read them raw.

## What must each page contain?

- `title` frontmatter is required. `description` is recommended.
- Start with a short answer to "What am I looking at?", then the next action.
- No raw HTML. It is not rendered.
- Link to other pages with relative paths such as `guide.md` or `topic/index.md`.
  Links outside `docs/` become links to the source repository on GitHub.
  Root-relative links such as `/guide` are rejected as ambiguous.

Order and naming follow Fumadocs conventions: `index.md` is a folder's landing page and
`meta.json` sets `title` and `pages`.

## How should I set up a repository?

1. Read the repository's existing documentation and decide what is worth publishing.
2. Create `docs/` and move or write pages into it, preserving existing history with `git mv`.
3. Add `docs/index.md` linking to the other pages.
4. Fix links and add `title` and `description` to every page.
5. Run the check from a Knowledge Base checkout:

   ```sh
   node scripts/check-source-docs.mjs <path-to-repository>
   ```

   Fix every error. Warnings, such as a missing `description`, are advisory.
6. Open a pull request in the source repository. Do not push by default.

## How is the repository published?

Knowledge Base owns where each repository appears. Register it by adding an entry to
Knowledge Base's `sources.json` with the repository, branch, and mount path, such as
`nori-cloud/actions` mounted at `projects/actions`. That is a separate pull request
in Knowledge Base; never invent mount paths in the source repository.

## Is there any external references to this documentation?

- [Knowledge Base](https://github.com/nori-cloud/knowledge-base) — the loader and the check script.
- [Fumadocs page conventions](https://fumadocs.dev/docs/next/page-conventions) — `index` and `meta.json` rules.
