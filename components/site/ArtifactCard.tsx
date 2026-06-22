import Link from "next/link";
import type { ArtifactCardData } from "@/lib/artifacts/public";

export function ArtifactCard({ a }: { a: ArtifactCardData }) {
  return (
    <Link
      href={`/a/${a.slug}`}
      className="group block rounded-xl border border-neutral-200 bg-white p-5 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
    >
      <h3 className="font-medium leading-snug text-neutral-900">{a.title}</h3>
      {a.summary && <p className="mt-1.5 line-clamp-3 text-sm leading-6 text-neutral-600">{a.summary}</p>}
      {a.published_at && (
        <p className="mt-3 text-xs text-neutral-400">
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
