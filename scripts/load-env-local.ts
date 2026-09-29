import { existsSync } from "node:fs";

// Same file Next.js reads, so a URL set there is never ignored in favour of the Docker fallback.
// Variables already in the environment win. Values are never printed.
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}
