import { afterEach, describe, expect, it, vi } from "vitest";

import { parseServerEnv } from "./server-env";

const URL_OK = "postgres://framed_app_login:secret@localhost:5433/framed";

describe("parseServerEnv", () => {
  it.each([URL_OK, "postgresql://user:pw@ep-pooler.neon.tech/db?sslmode=require"])(
    "accepts a Postgres URL (%s)",
    (url) => {
      expect(parseServerEnv({ DATABASE_URL: url })).toEqual({ DATABASE_URL: url });
    },
  );

  it("rejects a missing database URL with a readable message", () => {
    expect(() => parseServerEnv({})).toThrow(/DATABASE_URL/);
  });

  it.each(["mysql://user@localhost/db", "http://localhost:5433", "not a url", ""])(
    "rejects %j",
    (url) => {
      expect(() => parseServerEnv({ DATABASE_URL: url })).toThrow(/DATABASE_URL must be/);
    },
  );

  it("does not echo the value, which carries the password", () => {
    expect(() => parseServerEnv({ DATABASE_URL: "mysql://user:hunter2@localhost/db" })).not.toThrow(
      /hunter2/,
    );
  });
});

describe("getServerEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  async function freshGetServerEnv() {
    vi.resetModules();
    return (await import("./server-env")).getServerEnv;
  }

  it("reads and validates process.env", async () => {
    vi.stubEnv("DATABASE_URL", URL_OK);
    const getServerEnv = await freshGetServerEnv();

    expect(getServerEnv()).toEqual({ DATABASE_URL: URL_OK });
  });

  it("treats a blank value as unset", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const getServerEnv = await freshGetServerEnv();

    expect(() => getServerEnv()).toThrow(/DATABASE_URL/);
  });

  it("validates once and returns the same object afterwards", async () => {
    vi.stubEnv("DATABASE_URL", URL_OK);
    const getServerEnv = await freshGetServerEnv();
    const first = getServerEnv();
    vi.stubEnv("DATABASE_URL", "not a url");

    expect(getServerEnv()).toBe(first);
  });
});
