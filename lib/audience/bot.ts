// Pure helpers for the privacy-first audience recorder (lib/audience/record.ts). They decide whether
// a request is a real human page view and extract the salting inputs. No PII is stored anywhere —
// the IP/UA they return are only fed into a salted one-way hash inside Postgres (migration 0011).

// Lowercased substrings that mark an automated client we should not count as a reader. Conservative
// by design: better to undercount the "are practitioners reading this?" signal than to inflate it
// with crawlers, link-preview bots, AI fetchers, uptime monitors, and headless tooling.
const BOT_UA_MARKERS = [
  "bot",
  "crawl",
  "spider",
  "slurp",
  "mediapartners",
  "bingpreview",
  "facebookexternalhit",
  "embedly",
  "quora link preview",
  "pinterest",
  "vkshare",
  "w3c_validator",
  "headless",
  "phantomjs",
  "puppeteer",
  "playwright",
  "lighthouse",
  "gptbot",
  "claudebot",
  "claude-web",
  "anthropic",
  "ccbot",
  "perplexitybot",
  "google-extended",
  "ahrefs",
  "semrush",
  "mj12",
  "dotbot",
  "petalbot",
  "bytespider",
  "dataforseo",
  "python-requests",
  "curl/",
  "wget/",
  "go-http-client",
  "node-fetch",
  "axios/",
  "okhttp",
  "uptime",
  "pingdom",
  "statuscake",
  "newrelicpinger",
];

// True if the UA looks like a bot/crawler/automation rather than a human browser. A missing UA is
// treated as non-human (real browsers always send one) so probes don't inflate the signal.
export function isBotUserAgent(ua: string | null | undefined): boolean {
  if (!ua) return true;
  const s = ua.toLowerCase();
  return BOT_UA_MARKERS.some((m) => s.includes(m));
}

// The original client IP: the first hop of X-Forwarded-For, else X-Real-IP, else "". Used only as a
// salting input — never stored.
export function clientIp(get: (name: string) => string | null): string {
  const xff = get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return get("x-real-ip")?.trim() || "";
}

// True if this request is a Next.js prefetch (router/hover prefetch or a speculative fetch) rather
// than a real navigation — those should not count as reads.
export function isPrefetch(get: (name: string) => string | null): boolean {
  if (get("next-router-prefetch")) return true;
  const purpose = get("purpose") || get("sec-purpose") || get("x-purpose") || "";
  return /prefetch/i.test(purpose);
}
