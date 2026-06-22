import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { STATUS_ORDER, STATUS_META, type Status } from "@/lib/admin/labels";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const supabase = createClient();
  const status = searchParams.status as Status | undefined;
  const q = (searchParams.q ?? "").trim();

  let query = supabase
    .from("artifacts")
    .select("id, slug, title, status, updated_at, deleted_at")
    .order("updated_at", { ascending: false })
    .limit(300);
  if (status && STATUS_META[status]) query = query.eq("status", status);
  const { data } = await query;
  const items = (data ?? []).filter((a) => !q || a.title.toLowerCase().includes(q.toLowerCase()));

  const chip = (label: string, value?: string) => {
    const active = (value ?? "") === (status ?? "");
    const href = value ? `/admin/library?status=${value}` : "/admin/library";
    return (
      <Link
        key={label}
        href={href}
        className={cn(
          "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
          active ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300",
        )}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
        <form className="flex items-center gap-2" action="/admin/library" method="get">
          {status && <input type="hidden" name="status" value={status} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="Search titles…"
            className="h-9 w-56 rounded-md border border-neutral-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </form>
      </div>

      <div className="flex flex-wrap gap-2">
        {chip("All")}
        {STATUS_ORDER.map((s) => chip(STATUS_META[s].label, s))}
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        {items.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No artifacts.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {items.map((a) => (
              <li key={a.id}>
                <Link href={`/admin/a/${a.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50">
                  <StatusBadge status={a.status} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{a.title}</span>
                  {a.deleted_at && <span className="text-xs text-destructive">trashed</span>}
                  <span className="hidden text-xs text-neutral-400 sm:inline">
                    {new Date(a.updated_at).toLocaleDateString()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
