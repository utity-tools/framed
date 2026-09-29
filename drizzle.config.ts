import "./scripts/load-env-local";

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema",
  out: "./src/db/migrations",
  dbCredentials: {
    // Owner connection. Falls back to the local Docker value documented in .env.example; this
    // tooling-only default never applies to the app (see src/db/client.ts).
    url:
      process.env.MIGRATION_DATABASE_URL ||
      "postgres://framed_owner:framed_owner@localhost:5433/framed",
  },
});
