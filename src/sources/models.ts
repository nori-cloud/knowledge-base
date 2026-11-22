import type { StructuredData } from "fumadocs-core/mdx-plugins/remark-structure";
import type { MetaData, PageData, VirtualFile } from "fumadocs-core/source";
import type { TOCItemType } from "fumadocs-core/toc";
import type { MDXContent } from "mdx/types";
import { z } from "zod";

export const sourceEntrySchema = z.object({
  repo: z.string().regex(/^[\w.-]+\/[\w.-]+$/, "expected owner/name"),
  ref: z.string().min(1).default("main"),
  mount: z
    .string()
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*(\/[a-z0-9]+(-[a-z0-9]+)*)*$/,
      "expected a lowercase path",
    ),
  title: z.string().min(1),
});

export const githubFrontmatterSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
});

export const githubMetaSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  pages: z.array(z.string()).optional(),
  defaultOpen: z.boolean().optional(),
  collapsible: z.boolean().optional(),
});

export const githubTreeSchema = z.object({
  truncated: z.boolean().optional(),
  tree: z.array(z.object({ path: z.string(), type: z.string() })),
});

export interface LinkContext {
  repo: string;
  ref: string;
  mount: string;
  baseUrl: string;
}

export interface GitHubAdapterOptions extends LinkContext {
  title: string;
  token?: string;
}

export interface MarkdownNode {
  type: string;
  url?: string;
  lang?: string | null;
  value?: string;
  children?: MarkdownNode[];
  data?: Record<string, unknown>;
}

/** What every page exposes, whichever adapter produced it. */
export interface DocData extends PageData {
  title: string;
  description?: string;
  full?: boolean;
  body: MDXContent;
  toc: TOCItemType[];
  structuredData: StructuredData;
  getText(type: "raw" | "processed"): Promise<string>;
  /** Where the page is edited, when it is not in this repository. */
  sourceUrl?: string;
}

export type DocMeta = MetaData;

export type DocFile = VirtualFile<{ pageData: DocData; metaData: DocMeta }>;

/** A place documents are loaded from. */
export interface SourceAdapter {
  /** Virtual folder the adapter's files appear under; empty for the site root. */
  mount: string;
  /** Files with paths relative to the mount. Must not throw. */
  files(): Promise<DocFile[]> | DocFile[];
}
