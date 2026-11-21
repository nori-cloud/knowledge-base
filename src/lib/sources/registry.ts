import { z } from "zod";
import sources from "../../../sources.json";

const entry = z.object({
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

export type SourceEntry = z.infer<typeof entry>;

/** Remote repositories published by this site, from `sources.json`. */
export const sourceEntries: SourceEntry[] = z.array(entry).parse(sources);
