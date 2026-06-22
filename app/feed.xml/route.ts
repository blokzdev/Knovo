import { listPublished } from "@/lib/artifacts/public";

export const dynamic = "force-dynamic";

const SITE = "https://www.knovo.ai";

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c === "'" ? "&apos;" : "&quot;",
  );
}

// Public RSS 2.0 feed of recently published explainers. Account-free; powers the "subscribe"
// story until transactional email lands.
export async function GET() {
  const items = await listPublished(50);
  const updated = items[0]?.published_at ?? new Date().toISOString();

  const entries = items
    .map((a) => {
      const url = `${SITE}/a/${a.slug}`;
      const date = a.published_at ? new Date(a.published_at).toUTCString() : "";
      return `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      ${a.summary ? `<description>${escapeXml(a.summary)}</description>` : ""}
      ${date ? `<pubDate>${date}</pubDate>` : ""}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Knovo</title>
    <link>${SITE}</link>
    <description>Interactive, source-grounded explainers in molecular science.</description>
    <lastBuildDate>${new Date(updated).toUTCString()}</lastBuildDate>
${entries}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=3600",
    },
  });
}
