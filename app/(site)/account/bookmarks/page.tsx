import type { Metadata } from "next";
import Link from "next/link";
import { Compass } from "lucide-react";
import { ArtifactCard } from "@/components/site/ArtifactCard";
import { EmptyState, PageHeader } from "@/components/common/layout";
import { Button } from "@/components/ui/button";
import { listBookmarkedArtifacts } from "@/lib/reader/queries";
import { getViewer } from "@/lib/reader/viewer";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "My bookmarks",
  robots: { index: false, follow: false },
};

export default async function BookmarksPage() {
  const viewer = await getViewer();

  if (!viewer) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <PageHeader title="My bookmarks" description="Sign in to save explainers and find them here." />
        <EmptyState className="mt-8">Sign in from the account menu to start saving explainers.</EmptyState>
      </main>
    );
  }

  const items = await listBookmarkedArtifacts();

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <PageHeader title="My bookmarks" description="Explainers you've saved." />
      {items.length === 0 ? (
        <EmptyState className="mt-8" icon={<Compass className="h-5 w-5" />}>
          <p>Nothing saved yet.</p>
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link href="/explore">Browse the library</Link>
          </Button>
        </EmptyState>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a) => (
            <ArtifactCard key={a.slug} a={a} />
          ))}
        </div>
      )}
    </main>
  );
}
