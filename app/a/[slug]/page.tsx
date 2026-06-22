import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function getPublishedArtifact(slug: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("artifacts")
    .select("slug, title, summary, published_at, updated_at")
    .eq("status", "published")
    .eq("slug", slug)
    .maybeSingle();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const a = await getPublishedArtifact(params.slug);
  if (!a) return { title: "Not found — Knovo" };
  return {
    title: `${a.title} — Knovo`,
    description: a.summary ?? undefined,
    alternates: { canonical: `/a/${a.slug}` },
  };
}

export default async function ArtifactPage({ params }: { params: { slug: string } }) {
  const a = await getPublishedArtifact(params.slug);
  if (!a) notFound();

  // Structured data for search discovery (server-rendered).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    headline: a.title,
    description: a.summary ?? undefined,
    datePublished: a.published_at ?? undefined,
    dateModified: a.updated_at ?? undefined,
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1 className="text-2xl font-semibold">{a.title}</h1>
      {a.summary ? <p className="mt-2 text-neutral-600">{a.summary}</p> : null}
      <p className="mt-8 rounded-lg border border-dashed border-neutral-300 p-4 text-sm text-neutral-500">
        The responsive artifact renderer (3D / diagram / charts + auto provenance footer)
        ships in Phase 1.
      </p>
    </main>
  );
}
