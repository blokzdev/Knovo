import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

// Integration tests that drive the governed worker API end-to-end against a RUNNING local Supabase
// stack (`supabase start`). These are deliberately kept OUT of the default `npm test` (which is
// DB-free and runs in CI with placeholder env) — run them on demand with `npm run test:integration`.
// They are the repeatable Phase-1 operational-validation gate. See docs/operational-validation.md.
export default defineConfig({
  test: {
    environment: "node",
    include: ["test/integration/**/*.test.ts"],
    setupFiles: ["test/integration/load-env.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
    // The loop is stateful and ordered; never parallelise across files.
    fileParallelism: false,
  },
  resolve: {
    alias: { "@": resolve(process.cwd()) },
  },
});
