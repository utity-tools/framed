import { sql } from "drizzle-orm";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { APP_URL } from "../../tests/db/urls";
import { createDb, type Database } from "./client";
import { withTenant } from "./tenant";

const SETTINGS = `select current_setting('app.user_id', true) as user_id,
  current_setting('app.organization_id', true) as organization_id`;

let pool: Pool;
let db: Database;

beforeAll(() => {
  // One connection, so "gone after the transaction" is proved on the very same session.
  pool = new Pool({ connectionString: APP_URL, max: 1 });
  db = createDb(pool);
});

afterAll(async () => {
  await pool.end();
});

async function readSettings() {
  const { rows } = await pool.query<{ user_id: string | null; organization_id: string | null }>(
    SETTINGS,
  );
  return rows[0];
}

describe("withTenant", () => {
  it("exposes the context inside the transaction", async () => {
    const seen = await withTenant(
      { userId: "user-1", organizationId: "org-1" },
      async (tx) => (await tx.execute(sql.raw(SETTINGS))).rows[0],
      db,
    );

    expect(seen).toEqual({ user_id: "user-1", organization_id: "org-1" });
  });

  it("returns what the callback returns", async () => {
    await expect(
      withTenant({ userId: "u", organizationId: "o" }, async () => 42, db),
    ).resolves.toBe(42);
  });

  it("clears the context after commit, on the same connection", async () => {
    await withTenant({ userId: "user-1", organizationId: "org-1" }, async () => undefined, db);

    // set_config(..., true) leaves an empty string behind, and RLS policies match no row on it.
    expect(await readSettings()).toEqual({ user_id: "", organization_id: "" });
  });

  it("clears the context after a rolled-back transaction", async () => {
    await expect(
      withTenant(
        { userId: "user-1", organizationId: "org-1" },
        async () => {
          throw new Error("boom");
        },
        db,
      ),
    ).rejects.toThrow("boom");

    expect(await readSettings()).toEqual({ user_id: "", organization_id: "" });
  });

  it.each([
    { userId: "", organizationId: "org-1" },
    { userId: "user-1", organizationId: "" },
  ])("rejects an empty id before touching the database (%j)", async (context) => {
    await expect(withTenant(context, async () => 1, db)).rejects.toThrow();
  });
});

describe("app login user", () => {
  it("is a member of framed_app, is not superuser and cannot bypass RLS", async () => {
    const { rows } = await pool.query<{
      is_member: boolean;
      rolsuper: boolean;
      rolbypassrls: boolean;
    }>(
      `select pg_has_role(current_user, 'framed_app', 'member') as is_member,
              r.rolsuper, r.rolbypassrls
         from pg_roles r where r.rolname = current_user`,
    );

    expect(rows[0]).toEqual({ is_member: true, rolsuper: false, rolbypassrls: false });
  });

  it.each(["framed_app", "framed_auth"])(
    "group role %s cannot log in nor bypass RLS",
    async (role) => {
      const { rows } = await pool.query(
        "select rolcanlogin, rolsuper, rolbypassrls from pg_roles where rolname = $1",
        [role],
      );

      expect(rows).toEqual([{ rolcanlogin: false, rolsuper: false, rolbypassrls: false }]);
    },
  );
});
