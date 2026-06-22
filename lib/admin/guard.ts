import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export type AdminContext =
  | { ok: true; user: User }
  | { ok: false; reason: "unauthenticated" | "forbidden" };

// Resolve the current admin context for pages/layout (renders sign-in / forbidden states).
export async function getAdminContext(): Promise<AdminContext> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "unauthenticated" };
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return { ok: false, reason: "forbidden" };
  return { ok: true, user };
}

// Strict gate for server actions: throws unless the caller is an authenticated admin.
export async function requireAdmin(): Promise<{ user: User }> {
  const ctx = await getAdminContext();
  if (!ctx.ok) throw new Error("Not authorized.");
  return { user: ctx.user };
}
