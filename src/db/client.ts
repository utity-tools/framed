import "server-only";

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { getServerEnv } from "@/lib/server-env";

import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

// Small on purpose: every serverless instance keeps its own pool, and Neon's pooler multiplexes.
const POOL_MAX = 5;

// Outside production the module is re-evaluated on hot reload; keeping the pool on globalThis
// stops each reload from leaking a pool (and its connections).
const globalForDb = globalThis as unknown as { framedPool?: Pool };
let productionPool: Pool | undefined;
let db: Database | undefined;

function createPool(): Pool {
  const pool = new Pool({ connectionString: getServerEnv().DATABASE_URL, max: POOL_MAX });
  // An idle client can fail (server restart, network). Without a listener that crashes the
  // process. Log the code only: messages may echo connection details.
  pool.on("error", (error: Error & { code?: string }) => {
    console.error(`Postgres pool error (${error.code ?? error.name})`);
  });
  return pool;
}

/** Shared pool for the app login user, created on first use from the validated env. */
export function getPool(): Pool {
  if (process.env.NODE_ENV === "production") {
    return (productionPool ??= createPool());
  }
  return (globalForDb.framedPool ??= createPool());
}

/** Drizzle instance over the shared pool. Tenant data must go through `withTenant`. */
export function getDb(): Database {
  db ??= drizzle(getPool(), { schema });
  return db;
}

/** Builds a Drizzle instance over a given pool (tests use it with a single-connection pool). */
export function createDb(source: Pool): Database {
  return drizzle(source, { schema });
}
