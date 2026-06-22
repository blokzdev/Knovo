import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArtifactCard } from "@/components/site/ArtifactCard";
import { getSeriesWithArtifacts } from "@/lib/artifacts/public";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const s = await getSeriesWithArtifacts(params.slug);
  if (!s) return { title: "Series not found" };
  return {
    title: s.title,
    description: s.summary ?? undefined,
    alternates: { canonical: `/series/${s.slug}` },
  };
}

export default async function SeriesPage({ params }: { params: { slug: string } }) {
  const s = await getSeriesWithArtifacts(params.slug);
  if (!s) notFound();

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Series</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{s.title}</h1>
      {s.summary && <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">{s.summary}</p>}

      {s.artifacts.length === 0 ? (
        <p className="mt-8 text-sm text-neutral-500">No published parts yet.</p>
      ) : (
        <ol className="mt-8 grid gap-4 sm:grid-cols-2">
          {s.artifacts.map((a) => (
            <li key={a.slug}>
              <ArtifactCard a={a} />
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
