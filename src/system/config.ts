import { z } from "zod";

const environmentSchema = z.object({
  DEEPSEEK_API_KEY: z.string().min(1).optional(),
  DEEPSEEK_MODEL: z.string().min(1).default("deepseek-v4-flash"),
  GITHUB_TOKEN: z.string().min(1).optional(),
  SOURCE_REFRESH_INTERVAL_MS: z
    .string()
    .regex(/^[1-9]\d*$/, "Must be a positive integer in milliseconds")
    .transform(Number)
    .pipe(z.number().int().safe())
    .default(600_000),
});

export function parseConfig(env: Record<string, string | undefined>) {
  return environmentSchema.parse(env);
}

export const config = parseConfig(process.env);
