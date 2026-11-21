import type { SourceAdapter } from "./types";

/** Content compiled into the image from `content/docs`. */
export function localAdapter(source: {
  files: SourceAdapter["files"] extends () => infer R ? Awaited<R> : never;
}): SourceAdapter {
  return { mount: "", files: () => source.files };
}
