import { sql } from "drizzle-orm";
import { Pool } from "pg";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { AUTH_URL, APP_URL, OWNER_URL } from "../../../tests/db/urls";
import { createDb, type Database } from "../client";
import { withTenant } from "../tenant";

const ORG_A = "org-test-a";
const ORG_B = "org-test-b";
const USER = "user-test-1";

let owner: Pool;
let appPool: Pool;
let authPool: Pool;
let appDb: Database;

async function cleanup() {
  await owner.query("delete from organization where id = any($1)", [
    [ORG_A, ORG_B, "org-test-new"],
  ]);
}

beforeAll(() => {
  owner = new Pool({ connectionString: OWNER_URL, max: 1 });
  appPool = new Pool({ connectionString: APP_URL, max: 1 });
  authPool = new Pool({ connectionString: AUTH_URL, max: 1 });
  appDb = createDb(appPool);
});

afterAll(async () => {
  await Promise.all([owner.end(), appPool.end(), authPool.end()]);
});

beforeEach(async () => {
  await cleanup();
  await owner.query(
    `insert into organization (id, name, slug) values
       ($1, 'Gallery A', 'test-gallery-a'), ($2, 'Gallery B', 'test-gallery-b')`,
    [ORG_A, ORG_B],
  );
});

afterEach(cleanup);

/** The Postgres error code of a rejected promise, or undefined if it resolved. */
async function pgErrorCode(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
  } catch (error) {
    // drizzle wraps driver errors and keeps the original in `cause`.
    const err = error as { code?: string; cause?: { code?: string } };
    return err.cause?.code ?? err.code;
  }
  return undefined;
}

const asTenant = <T>(organizationId: string, fn: Parameters<typeof withTenant<T>>[1]) =>
  withTenant({ userId: USER, organizationId }, fn, appDb);

describe("organization table", () => {
  it("has row level security enabled and forced", async () => {
    const { rows } = await owner.query(
      `select relrowsecurity, relforcerowsecurity from pg_class
        where relname = 'organization' and relkind = 'r'`,
    );

    expect(rows).toEqual([{ relrowsecurity: true, relforcerowsecurity: true }]);
  });

  it("enforces a unique slug", async () => {
    const code = await pgErrorCode(
      owner.query("insert into organization (id, name, slug) values ('org-test-new', 'X', $1)", [
        "test-gallery-a",
      ]),
    );

    expect(code).toBe("23505");
  });
});

describe("organization constraints and policy definition", () => {
  it("rejects an empty id", async () => {
    const code = await pgErrorCode(
      owner.query("insert into organization (id, name, slug) values ('', 'X', 'test-empty')"),
    );

    expect(code).toBe("23514");
  });

  it("makes the app policy treat an empty context as NULL (NULLIF)", async () => {
    const { rows } = await owner.query(
      `select qual from pg_policies
        where tablename = 'organization' and policyname = 'organization_app_select'`,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].qual).toContain("NULLIF");
  });
});

describe("organization grants (privilege layer, separate from RLS)", () => {
  const privileges = async (role: string) => {
    const { rows } = await owner.query<{ privilege: string; granted: boolean }>(
      `select p as privilege, has_table_privilege($1, 'organization', p) as granted
         from unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE']) as p`,
      [role],
    );
    return rows.filter((row) => row.granted).map((row) => row.privilege);
  };

  it("gives framed_app SELECT only", async () => {
    await expect(privileges("framed_app")).resolves.toEqual(["SELECT"]);
  });

  it("gives framed_auth SELECT, INSERT, UPDATE and DELETE", async () => {
    await expect(privileges("framed_auth")).resolves.toEqual([
      "SELECT",
      "INSERT",
      "UPDATE",
      "DELETE",
    ]);
  });
});

describe("organization policies alone (grants lifted inside a rolled-back transaction)", () => {
  async function asAppWithWriteGrants(write: string) {
    const client = await owner.connect();
    try {
      await client.query("begin");
      await client.query("grant update, delete on organization to framed_app");
      await client.query("set local role framed_app");
      await client.query("select set_config('app.organization_id', $1, true)", [ORG_A]);
      return await client.query(write, [ORG_B]);
    } finally {
      await client.query("rollback");
      client.release();
    }
  }

  it("cannot update another organization: RLS hides the row", async () => {
    const result = await asAppWithWriteGrants(
      "update organization set name = 'Hacked' where id = $1",
    );

    expect(result.rowCount).toBe(0);
  });

  it("cannot delete another organization: RLS hides the row", async () => {
    const result = await asAppWithWriteGrants("delete from organization where id = $1");

    expect(result.rowCount).toBe(0);
  });

  it("left the grants untouched after the rollback", async () => {
    await asAppWithWriteGrants("delete from organization where id = $1");
    const { rows } = await owner.query(
      "select has_table_privilege('framed_app', 'organization', 'DELETE') as can_delete",
    );

    expect(rows).toEqual([{ can_delete: false }]);
  });
});

describe("organization as framed_app", () => {
  const selectIds = async (tx: Parameters<Parameters<typeof withTenant>[1]>[0]) =>
    (await tx.execute(sql`select id from organization where id like 'org-test-%' order by id`))
      .rows;

  it("sees exactly its own organization (A)", async () => {
    await expect(asTenant(ORG_A, selectIds)).resolves.toEqual([{ id: ORG_A }]);
  });

  it("sees exactly its own organization (B)", async () => {
    await expect(asTenant(ORG_B, selectIds)).resolves.toEqual([{ id: ORG_B }]);
  });

  it("sees nothing without a tenant context", async () => {
    const { rows } = await appPool.query("select id from organization");

    expect(rows).toEqual([]);
  });

  it("sees nothing for an unknown organization id", async () => {
    await expect(asTenant("org-does-not-exist", selectIds)).resolves.toEqual([]);
  });

  it("cannot insert an organization", async () => {
    const code = await pgErrorCode(
      asTenant(ORG_A, (tx) =>
        tx.execute(
          sql`insert into organization (id, name, slug) values ('org-test-new', 'N', 'test-new')`,
        ),
      ),
    );

    expect(code).toBe("42501");
  });

  it("cannot update its own organization", async () => {
    const code = await pgErrorCode(
      asTenant(ORG_A, (tx) =>
        tx.execute(sql`update organization set name = 'Hacked' where id = ${ORG_A}`),
      ),
    );

    expect(code).toBe("42501");
    const { rows } = await owner.query("select name from organization where id = $1", [ORG_A]);
    expect(rows).toEqual([{ name: "Gallery A" }]);
  });

  it("cannot delete its own organization", async () => {
    const code = await pgErrorCode(
      asTenant(ORG_A, (tx) => tx.execute(sql`delete from organization where id = ${ORG_A}`)),
    );

    expect(code).toBe("42501");
    const { rows } = await owner.query("select id from organization where id = $1", [ORG_A]);
    expect(rows).toHaveLength(1);
  });
});

describe("organization as framed_auth", () => {
  it("selects every organization", async () => {
    const { rows } = await authPool.query(
      "select id from organization where id like 'org-test-%' order by id",
    );

    expect(rows).toEqual([{ id: ORG_A }, { id: ORG_B }]);
  });

  it("inserts an organization with defaults", async () => {
    await authPool.query(
      "insert into organization (id, name, slug) values ('org-test-new', 'New', 'test-new')",
    );

    const { rows } = await owner.query(
      "select logo, metadata, created_at is not null as has_created_at from organization where id = 'org-test-new'",
    );
    expect(rows).toEqual([{ logo: null, metadata: null, has_created_at: true }]);
  });

  it("updates an organization", async () => {
    const result = await authPool.query("update organization set name = 'Renamed' where id = $1", [
      ORG_A,
    ]);

    expect(result.rowCount).toBe(1);
    const { rows } = await owner.query("select name from organization where id = $1", [ORG_A]);
    expect(rows).toEqual([{ name: "Renamed" }]);
  });

  it("deletes an organization", async () => {
    const result = await authPool.query("delete from organization where id = $1", [ORG_B]);

    expect(result.rowCount).toBe(1);
    const { rows } = await owner.query("select id from organization where id = $1", [ORG_B]);
    expect(rows).toEqual([]);
  });
});
