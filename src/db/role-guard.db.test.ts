import { Pool } from "pg";
import { afterEach, describe, expect, it } from "vitest";

import { APP_URL, AUTH_URL, OWNER_URL } from "../../tests/db/urls";
import { assertAppRole } from "./role-guard";

const pools: Pool[] = [];
function poolFor(url: string) {
  const pool = new Pool({ connectionString: url, max: 1 });
  pools.push(pool);
  return pool;
}

afterEach(async () => {
  await Promise.all(pools.splice(0).map((pool) => pool.end()));
});

describe("assertAppRole", () => {
  it("accepts the app login user", async () => {
    await expect(assertAppRole(poolFor(APP_URL))).resolves.toBeUndefined();
  });

  it("rejects the owner, which bypasses RLS", async () => {
    await expect(assertAppRole(poolFor(OWNER_URL))).rejects.toThrow(/bypass/i);
  });

  it("rejects the auth login user, which is not a member of framed_app", async () => {
    await expect(assertAppRole(poolFor(AUTH_URL))).rejects.toThrow(/framed_app/);
  });

  it("does not leak the connection string", async () => {
    const error = await assertAppRole(poolFor(OWNER_URL)).catch((e: Error) => e);

    expect(String((error as Error).message)).not.toContain("framed_owner:");
    expect(String((error as Error).message)).not.toContain("postgres://");
  });

  it("checks once per pool", async () => {
    const pool = poolFor(APP_URL);
    const spy = pool.query.bind(pool);
    let calls = 0;
    pool.query = ((...args: unknown[]) => {
      calls += 1;
      return (spy as (...a: unknown[]) => unknown)(...args);
    }) as typeof pool.query;

    await assertAppRole(pool);
    await assertAppRole(pool);

    expect(calls).toBe(1);
  });
});
