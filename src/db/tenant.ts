import "server-only";

import { sql } from "drizzle-orm";
import { z } from "zod";

import { getDb, type Database } from "./client";

const tenantContextSchema = z.object({
  userId: z.string().min(1),
  organizationId: z.string().min(1),
});

export type TenantContext = z.infer<typeof tenantContextSchema>;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

/**
 * Runs `fn` in a transaction acting for one user in one organization. The context is set with
 * transaction-local `set_config`, so a pooled connection never carries it to the next request,
 * and RLS policies read it through `current_setting('app.organization_id', true)`.
 * The ids must come from a verified session and membership, never from client input.
 */
export async function withTenant<T>(
  context: TenantContext,
  fn: (tx: Transaction) => Promise<T>,
  db: Database = getDb(),
): Promise<T> {
  const { userId, organizationId } = tenantContextSchema.parse(context);
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('app.user_id', ${userId}, true), set_config('app.organization_id', ${organizationId}, true)`,
    );
    return fn(tx);
  });
}
