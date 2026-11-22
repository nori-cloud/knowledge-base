import { metaSchema, pageSchema } from "fumadocs-core/source/schema";
import { defineDocs } from "fumadocs-mdx/macro";
import type { SourceAdapter } from "../models";

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

/** Content compiled into the image from `content/docs`. */
export function localAdapter(): SourceAdapter {
  const source = docs.toFumadocsSource();
  return { mount: "", files: () => source.files };
}
