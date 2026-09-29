import "../../scripts/load-env-local";

// Local Docker values documented in .env.example. Used only by DB tooling and tests, never by
// the app (src/db/client.ts requires DATABASE_URL).
export const OWNER_URL =
  process.env.MIGRATION_DATABASE_URL ||
  "postgres://framed_owner:framed_owner@localhost:5433/framed";
export const APP_URL =
  process.env.DATABASE_URL || "postgres://framed_app_login:framed_app_login@localhost:5433/framed";
