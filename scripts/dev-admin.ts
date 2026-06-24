/**
 * DEV-ONLY: provision a local admin and mint a browser session — no app change required.
 *
 * The app signs admins in with Google OAuth only, which isn't available against a local Supabase
 * stack. This utility (local stack only) does three things with the service-role key:
 *   1. Creates (or reuses) an admin auth user with a known email/password, auto-confirmed.
 *   2. Promotes that user's profile to role='admin'.
 *   3. Signs in through @supabase/ssr's createServerClient with a capturing cookie jar, so the
 *      emitted auth cookies are byte-identical to what the running app reads — and writes them to
 *      .dev-admin-cookies.json (git-ignored) for injection into a local browser session.
 *
 * Reads the local stack creds from the environment (load .env.local first). Never run against prod.
 *
 *   npm run dev:admin            # ensure admin + write cookie file
 *   npm run dev:admin -- --print # also print the cookies to stdout
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "../lib/database.types";

// Load .env.local into process.env (tsx does not read it automatically).
const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const raw of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL = process.env.DEV_ADMIN_EMAIL ?? "admin@knovo.local";
const PASSWORD = process.env.DEV_ADMIN_PASSWORD ?? "knovo-dev-admin";

if (!URL || !ANON || !SERVICE) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY (load .env.local).");
  process.exit(1);
}
// Guard: only ever run against a local stack.
if (!/^https?:\/\/(127\.0\.0\.1|localhost|0\.0\.0\.0)(:\d+)?/.test(URL)) {
  console.error(`Refusing to run: NEXT_PUBLIC_SUPABASE_URL (${URL}) is not local. This is a dev-only utility.`);
  process.exit(1);
}

async function main() {
  const svc = createClient<Database>(URL!, SERVICE!, { auth: { persistSession: false, autoRefreshToken: false } });

  // 1. Create or reuse the admin user.
  let userId: string | undefined;
  const created = await svc.auth.admin.createUser({ email: EMAIL, password: PASSWORD, email_confirm: true });
  userId = created.data?.user?.id;
  if (!userId) {
    const { data } = await svc.auth.admin.listUsers();
    userId = data?.users?.find((u) => u.email === EMAIL)?.id;
  }
  if (!userId) throw new Error(`Could not create or find user ${EMAIL}: ${created.error?.message}`);

  // 2. Promote to admin.
  const { error: upErr } = await svc.from("profiles").update({ role: "admin" }).eq("id", userId);
  if (upErr) throw new Error(`Promote to admin failed: ${upErr.message}`);

  // 3. Sign in through @supabase/ssr to capture the exact auth cookies the app reads.
  const jar = new Map<string, string>();
  const ssr = createServerClient<Database>(URL!, ANON!, {
    cookies: {
      getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
      setAll: (toSet) => {
        for (const { name, value } of toSet) {
          if (value) jar.set(name, value);
          else jar.delete(name);
        }
      },
    },
  });
  const { error: signErr } = await ssr.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (signErr) throw new Error(`Sign-in failed: ${signErr.message}`);

  const cookies = [...jar.entries()].map(([name, value]) => ({ name, value }));
  if (!cookies.length) throw new Error("No auth cookies were emitted by sign-in.");

  const outPath = resolve(process.cwd(), ".dev-admin-cookies.json");
  writeFileSync(outPath, JSON.stringify({ email: EMAIL, userId, cookies }, null, 2));

  console.log(`✓ admin ready: ${EMAIL} (role=admin, id=${userId})`);
  console.log(`✓ wrote ${cookies.length} auth cookie(s) → .dev-admin-cookies.json`);
  if (process.argv.includes("--print")) {
    for (const c of cookies) console.log(`  ${c.name} = ${c.value.slice(0, 32)}…(${c.value.length} chars)`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
