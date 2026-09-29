import "server-only";

import { z } from "zod";

const DATABASE_URL_ERROR =
  "DATABASE_URL must be a postgres:// or postgresql:// URL (e.g. postgres://user:password@localhost:5433/framed).";

export const serverEnvSchema = z.object({
  // Connection of the app login user (member of framed_app), never the owner used by migrations.
  DATABASE_URL: z.string({ error: DATABASE_URL_ERROR }).regex(/^postgres(ql)?:\/\/\S+$/, {
    error: DATABASE_URL_ERROR,
  }),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/** Validates raw values and throws one readable error listing every problem. */
export function parseServerEnv(raw: Record<string, string | undefined>): ServerEnv {
  const result = serverEnvSchema.safeParse(raw);
  if (!result.success) {
    // Messages never include the value: connection strings carry passwords.
    const problems = result.error.issues.map((issue) => `  - ${issue.message}`).join("\n");
    throw new Error(`Invalid server environment variables:\n${problems}`);
  }
  return result.data;
}

let cached: ServerEnv | undefined;

/** Server-only env vars, validated on first use and memoised (lazy so `next build` needs no DB). */
export function getServerEnv(): ServerEnv {
  cached ??= parseServerEnv({
    // `||` so a blank line copied from .env.example reads as unset.
    DATABASE_URL: process.env.DATABASE_URL || undefined,
  });
  return cached;
}
