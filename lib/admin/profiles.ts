import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Resolve the admin uuids embedded in actor strings ("admin:<uuid>") to display names, server-side
// (admin RLS context), so ActorBadge can render a name instead of a generic "Admin". Best-effort:
// rows the caller's RLS can't see simply fall back to "Admin". Workers / "system" actors are ignored.
export type ActorProfileMap = Record<string, { display_name: string | null; email: string | null }>;

export async function resolveActorProfiles(
  db: SupabaseClient<Database>,
  actors: (string | null | undefined)[],
): Promise<ActorProfileMap> {
  const ids = [
    ...new Set(
      actors.flatMap((a) => {
        const m = (a ?? "").match(/^admin:(.+)$/);
        return m ? [m[1]] : [];
      }),
    ),
  ];
  if (!ids.length) return {};
  const { data } = await db.from("profiles").select("id, display_name, email").in("id", ids);
  const map: ActorProfileMap = {};
  for (const p of data ?? []) map[p.id] = { display_name: p.display_name, email: p.email };
  return map;
}
