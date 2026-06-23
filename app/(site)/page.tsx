import Link from "next/link";
import { KnovoMark } from "@/components/Logo";
import { ArtifactCard } from "@/components/site/ArtifactCard";
import { listPublished } from "@/lib/artifacts/public";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const items = await listPublished(12);

  return (
    <main className="mx-auto max-w-5xl px-6">
      <section className="py-16 sm:py-24">
        <KnovoMark className="h-12 w-12" />
        <h1 className="mt-6 max-w-2xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Interactive, source-grounded explainers in molecular science.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          Structural &amp; molecular biology, molecular pharmacology, and de novo protein &amp; drug
          design — every explainer is grounded in a primary source you can verify.
        </p>
        <div className="mt-8">
          <Link
            href="/explore"
            className="inline-flex items-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Explore the library
          </Link>
        </div>
      </section>

      <section className="pb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recently published</h2>
        {items.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No published explainers yet — check back soon.</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {items.map((a) => (
              <ArtifactCard key={a.slug} a={a} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
