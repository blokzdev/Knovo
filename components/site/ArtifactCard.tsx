import Link from "next/link";
import type { ArtifactCardData } from "@/lib/artifacts/public";
import { cn, focusRing } from "@/lib/utils";

export function ArtifactCard({ a }: { a: ArtifactCardData }) {
  return (
    <Link
      href={`/a/${a.slug}`}
      className={cn(
        "group block rounded-xl border border-border bg-card p-5 transition-colors hover:border-foreground/20 hover:bg-accent",
        focusRing,
      )}
    >
      <h3 className="font-medium leading-snug text-foreground">{a.title}</h3>
      {a.summary && <p className="mt-1.5 line-clamp-3 text-sm leading-6 text-muted-foreground">{a.summary}</p>}
      {a.published_at && (
        <p className="mt-3 text-xs text-muted-foreground">
          {new Date(a.published_at).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </p>
      )}
    </Link>
  );
}
