import Link from "next/link";
import { Eye, Users } from "lucide-react";
import { EmptyState } from "@/components/common/layout";

// The most-read published artifacts in the window, ranked by views. Each row links to the public
// page and shows views + unique readers. Server-safe (no client JS).
export type TopArtifactRow = {
  artifactId: string;
  slug: string | null;
  title: string | null;
  views: number;
  readers: number;
};

export function TopArtifactsPanel({ rows }: { rows: TopArtifactRow[] }) {
  if (rows.length === 0) {
    return <EmptyState>No reads recorded yet — the signal builds as the library is visited.</EmptyState>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <ul className="divide-y divide-border">
        {rows.map((r, i) => {
          const title = r.title ?? "Untitled";
          return (
            <li key={r.artifactId} className="flex items-center gap-3 px-4 py-2.5">
              <span className="w-4 shrink-0 text-xs tabular-nums text-muted-foreground">{i + 1}</span>
              <div className="min-w-0 flex-1">
                {r.slug ? (
                  <Link
                    href={`/a/${r.slug}`}
                    className="block truncate text-sm font-medium text-foreground hover:text-brand hover:underline"
                    title={title}
                  >
                    {title}
                  </Link>
                ) : (
                  <span className="block truncate text-sm font-medium text-foreground" title={title}>
                    {title}
                  </span>
                )}
              </div>
              <span
                className="inline-flex items-center gap-1 whitespace-nowrap text-xs tabular-nums text-muted-foreground"
                title={`${r.views} view${r.views === 1 ? "" : "s"}`}
              >
                <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden /> {r.views}
              </span>
              <span
                className="inline-flex items-center gap-1 whitespace-nowrap text-xs tabular-nums text-muted-foreground"
                title={`${r.readers} unique reader${r.readers === 1 ? "" : "s"}`}
              >
                <Users className="h-3.5 w-3.5 shrink-0" aria-hidden /> {r.readers}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
