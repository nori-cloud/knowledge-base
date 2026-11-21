import type { StructuredData } from "fumadocs-core/mdx-plugins/remark-structure";
import type { MetaData, PageData, VirtualFile } from "fumadocs-core/source";
import type { TOCItemType } from "fumadocs-core/toc";
import type { MDXContent } from "mdx/types";

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
