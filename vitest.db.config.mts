import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: { "server-only": new URL("./tests/stubs/server-only.ts", import.meta.url).pathname },
  },
  test: {
    environment: "node",
    include: ["src/**/*.db.test.ts"],
    globalSetup: ["./tests/db/global-setup.ts"],
    // Files share one database; run them one after another.
    fileParallelism: false,
  },
});
