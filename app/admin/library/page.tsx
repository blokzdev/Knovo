import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ActorBadge } from "@/components/admin/activity/ActorBadge";
import { STATUS_ORDER, STATUS_META, type Status } from "@/lib/admin/labels";
import { PageHeader } from "@/components/common/layout";
import { cn, focusRing } from "@/lib/utils";

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
    .select("id, slug, title, status, updated_at, deleted_at, last_worker")
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
          focusRing,
          active ? "border-foreground bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:border-foreground/20",
        )}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Library"
        actions={
          <form className="flex w-full items-center gap-2 sm:w-auto" action="/admin/library" method="get">
            {status && <input type="hidden" name="status" value={status} />}
            <input
              name="q"
              defaultValue={q}
              placeholder="Search titles…"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:w-56"
            />
          </form>
        }
      />

      <div className="flex flex-wrap gap-2">
        {chip("All")}
        {STATUS_ORDER.map((s) => chip(STATUS_META[s].label, s))}
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {items.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No artifacts.</p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/admin/a/${a.id}`}
                  className={cn("flex items-center gap-3 px-4 py-3 hover:bg-accent", focusRing)}
                >
                  <StatusBadge status={a.status} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{a.title}</span>
                  {a.deleted_at && <span className="text-xs text-destructive">trashed</span>}
                  {a.last_worker && (
                    <span className="hidden md:inline-flex">
                      <ActorBadge actor={a.last_worker} />
                    </span>
                  )}
                  <span className="hidden whitespace-nowrap text-xs tabular-nums text-muted-foreground sm:inline">
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
