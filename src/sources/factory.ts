import { type DynamicSource, dynamicLoader } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";
import { z } from "zod";
import { docsRoute } from "@/lib/shared";
import { config } from "@/system/config";
import { githubAdapter } from "./adapter/github";
import { localAdapter } from "./adapter/local";
import {
  type DocData,
  type DocFile,
  type DocMeta,
  type SourceAdapter,
  sourceEntrySchema,
} from "./models";
import { mountPath } from "./utils/links";

const sources = [
  {
    repo: "nori-cloud/agents",
    ref: "main",
    mount: "projects/agents",
    title: "Agents",
  },
  {
    repo: "nori-cloud/actions",
    ref: "main",
    mount: "projects/actions",
    title: "Actions",
  },
  {
    repo: "nori-cloud/koukou",
    ref: "main",
    mount: "projects/koukou",
    title: "Koukou",
  },
];

export class SourceFactory {
  private readonly loader;

  constructor() {
    const entries = z.array(sourceEntrySchema).parse(sources);
    const adapters = [
      localAdapter(),
      ...entries.map((entry) =>
        githubAdapter({
          ...entry,
          baseUrl: docsRoute,
          token: config.GITHUB_TOKEN,
        }),
      ),
    ];

    this.loader = dynamicLoader(this.combine(adapters), {
      baseUrl: docsRoute,
      slugs(_file, next) {
        const slugs = next();
        return slugs.at(-1) === "SKILL" ? slugs.slice(0, -1) : slugs;
      },
      plugins: [lucideIconsPlugin()],
    });
  }

  private combine(
    adapters: SourceAdapter[],
  ): DynamicSource<{ pageData: DocData; metaData: DocMeta }> {
    return {
      cache: "memory",
      staleTime: config.SOURCE_REFRESH_INTERVAL_MS,
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

  getSource() {
    return this.loader.get();
  }
}

const factory = new SourceFactory();

export function getSource() {
  return factory.getSource();
}
