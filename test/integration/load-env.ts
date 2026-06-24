import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// vitest does not read .env files. Load .env.local (the local Supabase stack URL/keys + worker
// tokens, written during `supabase start` setup) into process.env so the worker route handlers and
// the test's supabase clients pick them up. Anything already in process.env wins (lets a runner
// override via the shell). See docs/operational-validation.md.
const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const raw of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}
