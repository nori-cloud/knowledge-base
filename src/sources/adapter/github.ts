import { createCompiler } from "@fumadocs/mdx-remote";
import { structure } from "fumadocs-core/mdx-plugins/remark-structure";
import {
  type DocData,
  type DocFile,
  type GitHubAdapterOptions,
  githubFrontmatterSchema,
  githubMetaSchema,
  githubTreeSchema,
  type LinkContext,
  type MarkdownNode,
  type SourceAdapter,
} from "../models";
import { rewriteLink } from "../utils/links";

function visit(node: MarkdownNode, callback: (node: MarkdownNode) => void) {
  callback(node);
  for (const child of node.children ?? []) visit(child, callback);
}

/**
 * Publishes the Markdown under a repository's `docs/` folder.
 *
 * Content is compiled as plain Markdown, so it can never run code or raw HTML.
 * The repository is only re-read when its branch has a new commit.
 */
export function githubAdapter(options: GitHubAdapterOptions): SourceAdapter {
  const { repo, ref, mount, title, baseUrl, token } = options;
  const context: LinkContext = { repo, ref, mount, baseUrl };
  const compiler = createCompiler({
    format: "md",
    remarkImageOptions: false,
    remarkPlugins: (defaults) => [...defaults, remarkSourceContent],
  });
  let last: { sha: string; files: DocFile[] } | undefined;

  function remarkSourceContent() {
    return (tree: MarkdownNode, file: { path?: string }) => {
      const from = file.path ?? "index.md";
      visit(tree, (node) => {
        if (
          (node.type === "link" ||
            node.type === "image" ||
            node.type === "definition") &&
          node.url
        ) {
          node.url =
            rewriteLink(
              from,
              node.url,
              context,
              node.type === "image" ? "image" : "link",
            ) ?? node.url;
        } else if (node.type === "code" && node.lang === "mermaid") {
          const chart = node.value ?? "";
          node.type = "mermaid";
          node.data = { hName: "Mermaid", hProperties: { chart } };
          node.children = [];
        }
      });
    };
  }

  async function get(url: string, accept?: string): Promise<Response> {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "knowledge-base",
        ...(accept ? { Accept: accept } : {}),
        ...(token && url.startsWith("https://api.github.com/")
          ? { Authorization: `Bearer ${token}` }
          : {}),
      },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`${response.status} ${url}`);
    return response;
  }

  async function page(path: string, sha: string): Promise<DocFile> {
    const relative = path.slice("docs/".length);
    try {
      const raw = await (
        await get(`https://raw.githubusercontent.com/${repo}/${sha}/${path}`)
      ).text();
      const compiled = await compiler.compile({
        source: raw,
        filePath: relative,
      });
      const data = githubFrontmatterSchema.parse(compiled.frontmatter);
      const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
      return {
        type: "page",
        path: relative,
        data: {
          title: data.title,
          description: data.description,
          body: compiled.body as DocData["body"],
          toc: compiled.toc,
          structuredData: structure(body),
          getText: async (type) => (type === "raw" ? raw : body),
          sourceUrl: `https://github.com/${repo}/blob/${ref}/${path}`,
        },
      } as DocFile;
    } catch (error) {
      throw new Error(`Could not load ${repo}:${path}`, { cause: error });
    }
  }

  async function metaFile(path: string, sha: string): Promise<DocFile> {
    const relative = path.slice("docs/".length);
    try {
      const raw = await (
        await get(`https://raw.githubusercontent.com/${repo}/${sha}/${path}`)
      ).text();
      return {
        type: "meta",
        path: relative,
        data: githubMetaSchema.parse(JSON.parse(raw)),
      };
    } catch (error) {
      throw new Error(`Could not load ${repo}:${path}`, { cause: error });
    }
  }

  async function load(sha: string): Promise<DocFile[]> {
    const tree = githubTreeSchema.parse(
      await (
        await get(
          `https://api.github.com/repos/${repo}/git/trees/${sha}?recursive=1`,
        )
      ).json(),
    );
    if (tree.truncated) throw new Error(`GitHub tree is truncated for ${repo}`);
    const paths = tree.tree
      .filter(
        (entry) => entry.type === "blob" && entry.path.startsWith("docs/"),
      )
      .map((entry) => entry.path);
    if (!paths.includes("docs/index.md")) {
      throw new Error(`${repo} is missing docs/index.md`);
    }
    const files = (
      await Promise.all(
        paths.map((path) => {
          if (path.endsWith(".md")) return page(path, sha);
          if (path.endsWith("/meta.json")) return metaFile(path, sha);
          return undefined;
        }),
      )
    ).filter((file): file is DocFile => file !== undefined);

    const root = files.find(
      (file) => file.type === "meta" && file.path === "meta.json",
    );
    if (!root) files.push({ type: "meta", path: "meta.json", data: { title } });
    else if (root.type === "meta" && !root.data.title) root.data.title = title;
    return files;
  }

  return {
    mount,
    async files() {
      try {
        const sha = (
          await (
            await get(
              `https://api.github.com/repos/${repo}/commits/${encodeURIComponent(ref)}`,
              "application/vnd.github.sha",
            )
          ).text()
        ).trim();
        if (!/^[a-f0-9]{40}$/i.test(sha))
          throw new Error(`Invalid commit SHA for ${repo}`);
        if (last?.sha === sha) return last.files;
        last = { sha, files: await load(sha) };
        return last.files;
      } catch (error) {
        console.error(`[sources] could not refresh ${repo}`, error);
        return last?.files ?? [];
      }
    },
  };
}
