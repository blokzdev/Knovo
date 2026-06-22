import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Service-role Supabase client for the trusted Knovo **worker API** only. This client
// BYPASSES RLS, so it is server-only and must never be imported into client code or the
// public site. The worker API (app/api/worker/*) is the single enforcement boundary for
// slot-schema validation, status transitions, audit logging, and soft-delete — workers never
// reach the database directly. See foundation/security-and-privacy.md (amended).
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
