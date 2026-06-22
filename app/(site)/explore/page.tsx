import type { Metadata } from "next";
import { ArtifactCard } from "@/components/site/ArtifactCard";
import { listPublished } from "@/lib/artifacts/public";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Explore",
  description: "Browse Knovo's source-grounded molecular-science explainers.",
  alternates: { canonical: "/explore" },
};

export default async function ExplorePage() {
  const items = await listPublished(120);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Explore</h1>
      <p className="mt-1 text-sm text-neutral-600">Every published explainer, newest first.</p>

      {items.length === 0 ? (
        <p className="mt-8 text-sm text-neutral-500">No published explainers yet.</p>
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
