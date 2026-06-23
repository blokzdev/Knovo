import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

// Node-environment unit tests for the pure renderer modules (lib/renderer/*). No jsdom / React /
// 3Dmol / recharts in the test run — these are pure-function tests. The `@` alias mirrors the
// tsconfig path so a test (or module under test) can import `@/lib/...`; resolved from the repo
// root via process.cwd() to avoid import.meta in a type-checked config file.
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/renderer/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": resolve(process.cwd()) },
  },
});
