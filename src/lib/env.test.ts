import { describe, expect, it, vi } from "vitest";

import { parsePublicEnv } from "./env";

describe("parsePublicEnv", () => {
  it("accepts a valid app URL and strips the trailing slash", () => {
    expect(parsePublicEnv({ NEXT_PUBLIC_APP_URL: "https://framed.example/" })).toEqual({
      NEXT_PUBLIC_APP_URL: "https://framed.example",
    });
  });

  it("accepts http for local development", () => {
    expect(parsePublicEnv({ NEXT_PUBLIC_APP_URL: "http://localhost:3000" })).toEqual({
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    });
  });

  it("rejects a missing app URL with a readable message", () => {
    expect(() => parsePublicEnv({})).toThrow(/NEXT_PUBLIC_APP_URL/);
  });

  it("rejects a value that is not an http(s) URL", () => {
    expect(() => parsePublicEnv({ NEXT_PUBLIC_APP_URL: "ftp://framed.example" })).toThrow(
      /NEXT_PUBLIC_APP_URL/,
    );
    expect(() => parsePublicEnv({ NEXT_PUBLIC_APP_URL: "not a url" })).toThrow(
      /NEXT_PUBLIC_APP_URL/,
    );
  });

  it("rejects a URL with a path, since tag URLs are built from the origin", () => {
    expect(() => parsePublicEnv({ NEXT_PUBLIC_APP_URL: "https://framed.example/app" })).toThrow(
      /origin/,
    );
  });
});

describe("getPublicEnv", () => {
  it("reads and validates process.env", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://framed.example/");
    vi.resetModules();
    const { getPublicEnv } = await import("./env");
    expect(getPublicEnv()).toEqual({ NEXT_PUBLIC_APP_URL: "https://framed.example" });
    vi.unstubAllEnvs();
  });

  it("treats a blank value as unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.resetModules();
    const { getPublicEnv } = await import("./env");
    expect(() => getPublicEnv()).toThrow(/NEXT_PUBLIC_APP_URL/);
    vi.unstubAllEnvs();
  });
});
