import type { DynamicSource } from "fumadocs-core/source";
import { mountPath } from "./links";
import type { DocData, DocFile, DocMeta, SourceAdapter } from "./types";

export type { DocData, DocFile, SourceAdapter } from "./types";

/**
 * Merges adapters into one source. Duplicate paths fail rather than shadow content.
 */
export function createSource(
  adapters: SourceAdapter[],
  options: { staleTime: number },
): DynamicSource<{ pageData: DocData; metaData: DocMeta }> {
  return {
    cache: "memory",
    staleTime: options.staleTime,
    async files() {
      const merged: DocFile[] = [];
      const seen = new Set<string>();
      for (const adapter of adapters) {
        for (const file of await adapter.files()) {
          const path = mountPath(adapter.mount, file.path);
          if (seen.has(path)) {
            throw new Error(`[sources] duplicate path: ${path}`);
          }
          seen.add(path);
          merged.push({ ...file, path });
        }
      }
      return merged;
    },
  };
}
