import type { Metadata } from "next";
import Link from "next/link";
import { ArtifactCard } from "@/components/site/ArtifactCard";
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
      <main className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">My bookmarks</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to save explainers and find them here.
        </p>
      </main>
    );
  }

  const items = await listBookmarkedArtifacts();

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">My bookmarks</h1>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Nothing saved yet. Browse the{" "}
          <Link href="/explore" className="underline hover:text-foreground">
            library
          </Link>{" "}
          and hit Save.
        </p>
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
