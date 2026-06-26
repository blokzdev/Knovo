// Pure, DB-agnostic aggregation for the admin Insights "Audience" section (Phase 2 validation —
// "are niche practitioners finding and RETURNING to these explainers?"). Folds the deduped daily
// rows from public.artifact_views (migration 0011) into a view model: views/day, unique + returning
// readers, and top artifacts.
//
// Privacy note: a `visitor_hash` is a cookieless, salted one-way hash whose salt rotates every 7
// days and is destroyed on rotation, so a hash is only stable *within* a salt window. "Returning"
// is therefore inherently a within-window signal (a reader seen on >= 2 distinct days); cross-window
// returns are intentionally unlinkable. No PII is involved at any layer.
//
// CONTRACT: `uniqueReaders` / `returningReaders` are computed over ALL `rows` passed in, so the
// caller MUST pass only rows within a single salt window (≤ 7 days) for those to be meaningful —
// across a wider window the same reader gets a fresh hash each window and would be over-counted as
// several "unique" readers. The Insights page enforces this by fetching exactly the 7-day window
// (`AUDIENCE_DAYS`). `totalViews` (raw hits) and `perDay` are salt-independent.
//
// Kept pure + `now`-injectable (no Date.now()) for deterministic unit tests, mirroring
// lib/admin/insights.ts.

const DAY_MS = 24 * 60 * 60 * 1000;

// The only artifact_views fields the aggregation reads.
export type AudienceViewRow = {
  artifact_id: string;
  day: string; // 'YYYY-MM-DD' (UTC), as stored
  visitor_hash: string;
  hits: number;
};

export type AudienceDayBucket = { date: string; views: number; readers: number };
export type TopArtifact = { artifactId: string; views: number; readers: number };

export type AudienceSummary = {
  totalViews: number; // sum of hits across the window
  uniqueReaders: number; // distinct visitor_hash across the window
  returningReaders: number; // visitor_hash observed on >= 2 distinct days
  returnRate: number | null; // returningReaders / uniqueReaders
  perDay: AudienceDayBucket[]; // oldest → newest, length `days`
  topArtifacts: TopArtifact[]; // desc by views then readers, length <= topN
};

const dayKey = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

export function summarizeAudience(
  rows: AudienceViewRow[],
  days: number,
  now: number,
  topN = 5,
): AudienceSummary {
  // Per-day buckets for the last `days` UTC days (oldest → newest).
  const buckets = new Map<string, { views: number; readers: Set<string> }>();
  const order: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = dayKey(now - i * DAY_MS);
    buckets.set(key, { views: 0, readers: new Set() });
    order.push(key);
  }

  const readerDays = new Map<string, Set<string>>(); // visitor_hash → set of distinct days
  const byArtifact = new Map<string, { views: number; readers: Set<string> }>();
  let totalViews = 0;

  for (const r of rows) {
    const hits = r.hits > 0 ? r.hits : 0;
    totalViews += hits;

    const seen = readerDays.get(r.visitor_hash) ?? new Set<string>();
    seen.add(r.day);
    readerDays.set(r.visitor_hash, seen);

    const art = byArtifact.get(r.artifact_id) ?? { views: 0, readers: new Set<string>() };
    art.views += hits;
    art.readers.add(r.visitor_hash);
    byArtifact.set(r.artifact_id, art);

    const b = buckets.get(r.day);
    if (b) {
      b.views += hits;
      b.readers.add(r.visitor_hash);
    }
  }

  const uniqueReaders = readerDays.size;
  let returningReaders = 0;
  for (const set of readerDays.values()) if (set.size >= 2) returningReaders++;

  const topArtifacts: TopArtifact[] = Array.from(byArtifact.entries())
    .map(([artifactId, v]) => ({ artifactId, views: v.views, readers: v.readers.size }))
    .sort((a, b) => b.views - a.views || b.readers - a.readers)
    .slice(0, topN);

  return {
    totalViews,
    uniqueReaders,
    returningReaders,
    returnRate: uniqueReaders === 0 ? null : returningReaders / uniqueReaders,
    perDay: order.map((date) => {
      const b = buckets.get(date)!;
      return { date, views: b.views, readers: b.readers.size };
    }),
    topArtifacts,
  };
}
