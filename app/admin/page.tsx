import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Sign in with Google to review drafts.
        </p>
        <p className="mt-4 text-xs text-neutral-400">
          OAuth wiring is in place; add Google credentials in Supabase Auth + .env.local
          (see SETUP.md) to enable sign-in.
        </p>
      </main>
    );
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="mt-2 text-sm text-neutral-600">
          This account is not an admin. Ask an existing admin to grant the role.
        </p>
      </main>
    );
  }

  const { data: drafts } = await supabase
    .from("artifacts")
    .select("slug, title, created_at")
    .eq("status", "draft")
    .order("created_at", { ascending: false });

  const items = drafts ?? [];

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Draft queue</h1>
      <p className="mt-2 text-sm text-neutral-600">
        {items.length} draft(s) awaiting review.
      </p>
      <ul className="mt-6 space-y-2">
        {items.map((d) => (
          <li key={d.slug} className="rounded-lg border border-neutral-200 p-3 text-sm">
            {d.title}
          </li>
        ))}
      </ul>
      <p className="mt-8 text-xs text-neutral-400">
        Rendered preview + promote/reject actions ship in Phase 1.
      </p>
    </main>
  );
}
