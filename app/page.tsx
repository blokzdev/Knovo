import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = createClient();
  const { data: artifacts } = await supabase
    .from("artifacts")
    .select("slug, title, summary, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(50);

  const items = artifacts ?? [];

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Knovo</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Interactive, source-grounded explainers in structural/molecular biology, molecular
        pharmacology, and de novo protein &amp; drug design.
      </p>

      <section className="mt-8 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-neutral-500">No published artifacts yet.</p>
        ) : (
          items.map((a) => (
            <Link
              key={a.slug}
              href={`/a/${a.slug}`}
              className="block rounded-lg border border-neutral-200 p-4 hover:bg-neutral-50"
            >
              <h2 className="font-medium">{a.title}</h2>
              {a.summary ? (
                <p className="mt-1 text-sm text-neutral-600">{a.summary}</p>
              ) : null}
            </Link>
          ))
        )}
      </section>
    </main>
  );
}
