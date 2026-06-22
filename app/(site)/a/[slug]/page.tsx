import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ArtifactRenderer } from "@/components/renderer/ArtifactRenderer";
import { BookmarkButton } from "@/components/reader/BookmarkButton";
import { SubscribeButton } from "@/components/reader/SubscribeButton";
import { Comments } from "@/components/reader/Comments";
import { getPublishedArtifact } from "@/lib/artifacts/public";
import { getBookmarked, getSubscribed } from "@/lib/reader/queries";
import { getViewer } from "@/lib/reader/viewer";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const a = await getPublishedArtifact(params.slug);
  if (!a) return { title: "Not found" };
  return {
    title: a.title,
    description: a.summary ?? undefined,
    alternates: { canonical: `/a/${a.slug}` },
    openGraph: {
      title: a.title,
      description: a.summary ?? undefined,
      type: "article",
      publishedTime: a.published_at ?? undefined,
      modifiedTime: a.updated_at,
    },
  };
}

export default async function ArtifactPage({ params }: { params: { slug: string } }) {
  const a = await getPublishedArtifact(params.slug);
  if (!a) notFound();

  const [viewer, bookmarked, subscribed] = await Promise.all([
    getViewer(),
    getBookmarked(a.id),
    getSubscribed(),
  ]);
  const signedIn = !!viewer;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    headline: a.title,
    description: a.summary ?? undefined,
    datePublished: a.published_at ?? undefined,
    dateModified: a.updated_at,
    isAccessibleForFree: true,
    url: `https://www.knovo.ai/a/${a.slug}`,
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="flex items-center justify-between gap-4">
        <Link
          href="/explore"
          className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900"
        >
          <ArrowLeft className="h-4 w-4" /> Explore
        </Link>
        <div className="flex items-center gap-2">
          <BookmarkButton artifactId={a.id} slug={a.slug} initial={bookmarked} signedIn={signedIn} />
          <SubscribeButton initial={subscribed} signedIn={signedIn} />
        </div>
      </div>

      <article className="mt-6">
        <ArtifactRenderer doc={a.doc} schemaVersion={a.schema_version} sources={a.sources} />
      </article>

      <Comments artifactId={a.id} slug={a.slug} viewer={viewer} />
    </main>
  );
}
