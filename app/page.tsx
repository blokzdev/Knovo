import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { KnovoMark } from "@/components/Logo";

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
      <div className="flex items-center gap-3">
        <KnovoMark className="h-9 w-9" />
        <h1 className="text-2xl font-semibold">Knovo</h1>
      </div>
      <p className="mt-3 text-sm text-neutral-600">
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

      <footer className="mt-16 border-t border-neutral-200 pt-6 text-xs text-neutral-400">
        <nav className="flex gap-4">
          <Link href="/legal/privacy" className="hover:text-neutral-600">
            Privacy
          </Link>
          <Link href="/legal/terms" className="hover:text-neutral-600">
            Terms
          </Link>
        </nav>
      </footer>
    </main>
  );
}
