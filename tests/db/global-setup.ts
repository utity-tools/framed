import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

import { OWNER_URL } from "./urls";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/** DB tests create and delete rows: never let them run against a shared or remote database. */
function assertLocalDatabase(url: string) {
  if (process.env.ALLOW_REMOTE_DB_TESTS === "1") return;
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error("MIGRATION_DATABASE_URL is not a valid URL.");
  }
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(
      `Refusing to run DB tests against a non-local database (host "${host}"). ` +
        "Unset MIGRATION_DATABASE_URL to use the Docker database, or set ALLOW_REMOTE_DB_TESTS=1 " +
        "if you really mean it.",
    );
  }
}

/** Applies every migration as the owner before the DB tests run (start Docker with `pnpm db:up`). */
export default async function setup() {
  assertLocalDatabase(OWNER_URL);
  const pool = new Pool({ connectionString: OWNER_URL, max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder: "./src/db/migrations" });
  } catch (error) {
    throw new Error("Could not migrate the test database. Is it running? Try `pnpm db:up`.", {
      cause: error,
    });
  } finally {
    await pool.end();
  }
}
