import { afterEach, describe, expect, it, vi } from "vitest";

import { parsePublicEnv } from "./env";

describe("parsePublicEnv", () => {
  it("accepts an https origin and strips the trailing slash", () => {
    expect(parsePublicEnv({ NEXT_PUBLIC_APP_URL: "https://framed.example/" })).toEqual({
      NEXT_PUBLIC_APP_URL: "https://framed.example",
    });
  });

  it.each(["http://localhost:3000", "http://127.0.0.1:3100"])(
    "accepts http for local development (%s)",
    (url) => {
      expect(parsePublicEnv({ NEXT_PUBLIC_APP_URL: url })).toEqual({ NEXT_PUBLIC_APP_URL: url });
    },
  );

  it("rejects http on any other host, since the URL is printed on cards", () => {
    expect(() => parsePublicEnv({ NEXT_PUBLIC_APP_URL: "http://framed.example" })).toThrow(/https/);
  });

  it("rejects a missing app URL with a readable message", () => {
    expect(() => parsePublicEnv({})).toThrow(/NEXT_PUBLIC_APP_URL/);
  });

  it.each(["ftp://framed.example", "not a url"])("rejects %s", (url) => {
    expect(() => parsePublicEnv({ NEXT_PUBLIC_APP_URL: url })).toThrow(/NEXT_PUBLIC_APP_URL/);
  });

  it.each([
    "https://framed.example/app",
    "https://framed.example/?ref=card",
    "https://framed.example/#top",
  ])("rejects anything beyond the origin (%s)", (url) => {
    expect(() => parsePublicEnv({ NEXT_PUBLIC_APP_URL: url })).toThrow(/origin/);
  });

  it("rejects credentials instead of silently dropping them", () => {
    expect(() => parsePublicEnv({ NEXT_PUBLIC_APP_URL: "https://user:pw@framed.example" })).toThrow(
      /origin/,
    );
  });
});

describe("getPublicEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  async function freshGetPublicEnv() {
    vi.resetModules();
    return (await import("./env")).getPublicEnv;
  }

  it("reads and validates process.env", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://framed.example/");
    const getPublicEnv = await freshGetPublicEnv();

    expect(getPublicEnv()).toEqual({ NEXT_PUBLIC_APP_URL: "https://framed.example" });
  });

  it("treats a blank value as unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    const getPublicEnv = await freshGetPublicEnv();

    expect(() => getPublicEnv()).toThrow(/NEXT_PUBLIC_APP_URL/);
  });

  it("validates once and returns the same object afterwards", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://framed.example");
    const getPublicEnv = await freshGetPublicEnv();
    const first = getPublicEnv();
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "not a url");

    expect(getPublicEnv()).toBe(first);
  });
});
