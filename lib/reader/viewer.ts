import { createClient } from "@/lib/supabase/server";

// The signed-in reader, with the public display fields used by the site header. Any authenticated
// user is a valid reader (the `admin` role is a superset). Returns null when signed out.
export type Viewer = {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
};

export async function getViewer(): Promise<Viewer | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, role")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? null,
    displayName: profile?.display_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    isAdmin: profile?.role === "admin",
  };
}
