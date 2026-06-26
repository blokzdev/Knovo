import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Service-role Supabase client for TRUSTED SERVER-ONLY code. This client BYPASSES RLS, so it must
// never be imported into client code or shipped to the browser, and the service-role key must never
// be NEXT_PUBLIC. Sanctioned callers:
//   - the governed worker API (app/api/worker/*) — the single write boundary that validates the
//     slot schema, enforces status transitions, audit-logs, and soft-deletes;
//   - the privacy-first audience recorder (lib/audience/record.ts) — a server-only RPC that writes a
//     salted, cookieless, no-PII view row (migration 0011); and the admin Insights read of those
//     rows, kept off any browser-reachable RLS so per-visitor hashes never reach a client.
// See foundation/security-and-privacy.md.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
