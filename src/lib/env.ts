import { z } from "zod";

const ORIGIN_ERROR =
  "NEXT_PUBLIC_APP_URL must be an http(s) origin without a path (e.g. http://localhost:3000).";

export const publicEnvSchema = z.object({
  // Tag URLs and QR codes are built from this origin, and they are printed on physical cards:
  // a stray path here would end up on every card.
  NEXT_PUBLIC_APP_URL: z
    .url({ protocol: /^https?$/, error: ORIGIN_ERROR })
    .transform((value) => new URL(value))
    .refine((url) => url.pathname === "/" && !url.search && !url.hash, { error: ORIGIN_ERROR })
    .transform((url) => url.origin),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

/** Validates raw values and throws one readable error listing every problem. */
export function parsePublicEnv(raw: Record<string, string | undefined>): PublicEnv {
  const result = publicEnvSchema.safeParse(raw);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `  - ${issue.message}`).join("\n");
    throw new Error(`Invalid public environment variables:\n${problems}`);
  }
  return result.data;
}

let cached: PublicEnv | undefined;

/**
 * Public env vars, validated on first use and memoised. Validation is lazy so `next build` can
 * compile routes that don't need them. Each variable is referenced explicitly so Next.js inlines
 * it into the browser bundle.
 */
export function getPublicEnv(): PublicEnv {
  cached ??= parsePublicEnv({
    // `||` so a blank line copied from .env.example reads as unset.
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || undefined,
  });
  return cached;
}
