import { dynamicLoader, llms } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";
import { metaSchema, pageSchema } from "fumadocs-core/source/schema";
import { defineDocs } from "fumadocs-mdx/macro";
import { docsRoute } from "./shared";
import { createSource } from "./sources";
import { githubAdapter } from "./sources/github";
import { localAdapter } from "./sources/local";
import { sourceEntries } from "./sources/registry";

const docs = defineDocs({
  dir: "content/docs",
  docs: {
    schema: pageSchema,
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

const REFRESH_MS = 10 * 60 * 1000;

const adapters = [
  localAdapter(docs.toFumadocsSource()),
  ...sourceEntries.map((entry) =>
    githubAdapter({
      ...entry,
      baseUrl: docsRoute,
      token: process.env.GITHUB_TOKEN,
    }),
  ),
];

// See https://fumadocs.dev/docs/headless/source-api for more info
const loader = dynamicLoader(
  createSource(adapters, { staleTime: REFRESH_MS }),
  {
    baseUrl: docsRoute,
    // A skill is installed as SKILL.md, but is published at its folder URL.
    slugs(_file, next) {
      const slugs = next();
      return slugs.at(-1) === "SKILL" ? slugs.slice(0, -1) : slugs;
    },
    plugins: [lucideIconsPlugin()],
  },
);

/** The merged documentation, refreshed when remote sources change. */
export function getSource() {
  return loader.get();
}

export async function getDocsLlms() {
  return llms(await getSource(), {
    renderPage: async (page) => `# ${page.data.title} (${page.url})

${await page.data.getText("processed")}`,
  });
}
