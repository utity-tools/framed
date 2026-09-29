import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    // `server-only` throws outside a React Server build; unit tests import server modules.
    alias: { "server-only": new URL("./tests/stubs/server-only.ts", import.meta.url).pathname },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "tests/unit/**/*.test.{ts,tsx}"],
    // Need Docker: run with `pnpm test:db`.
    exclude: [...configDefaults.exclude, "**/*.db.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**"],
      // Business logic lives in src/lib and is expected to be covered.
      thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 },
    },
  },
});
