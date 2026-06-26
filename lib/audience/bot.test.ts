import { describe, expect, it } from "vitest";
import { clientIp, isBotUserAgent, isPrefetch } from "./bot";

// A header getter backed by a plain map (case-insensitive keys, like a real Headers).
const hdr = (entries: Record<string, string>) => {
  const lower = new Map(Object.entries(entries).map(([k, v]) => [k.toLowerCase(), v]));
  return (name: string) => lower.get(name.toLowerCase()) ?? null;
};

describe("isBotUserAgent", () => {
  it("treats real browsers as human", () => {
    const chrome =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
    const safariIphone =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
    expect(isBotUserAgent(chrome)).toBe(false);
    expect(isBotUserAgent(safariIphone)).toBe(false);
  });

  it("flags crawlers, AI fetchers, tools, and monitors", () => {
    for (const ua of [
      "Googlebot/2.1 (+http://www.google.com/bot.html)",
      "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
      "facebookexternalhit/1.1",
      "GPTBot/1.0",
      "ClaudeBot/1.0",
      "PerplexityBot/1.0",
      "curl/8.4.0",
      "python-requests/2.31.0",
      "Mozilla/5.0 ... HeadlessChrome/126.0.0.0 ...",
      "Pingdom.com_bot_version_1.4",
    ]) {
      expect(isBotUserAgent(ua), ua).toBe(true);
    }
  });

  it("treats a missing UA as non-human", () => {
    expect(isBotUserAgent(null)).toBe(true);
    expect(isBotUserAgent(undefined)).toBe(true);
    expect(isBotUserAgent("")).toBe(true);
  });
});

describe("clientIp", () => {
  it("takes the first hop of X-Forwarded-For", () => {
    expect(clientIp(hdr({ "x-forwarded-for": "203.0.113.7, 70.41.3.18, 150.172.238.178" }))).toBe(
      "203.0.113.7",
    );
  });

  it("falls back to X-Real-IP, then empty", () => {
    expect(clientIp(hdr({ "x-real-ip": "198.51.100.9" }))).toBe("198.51.100.9");
    expect(clientIp(hdr({}))).toBe("");
  });
});

describe("isPrefetch", () => {
  it("detects Next router prefetch + purpose headers", () => {
    expect(isPrefetch(hdr({ "next-router-prefetch": "1" }))).toBe(true);
    expect(isPrefetch(hdr({ purpose: "prefetch" }))).toBe(true);
    expect(isPrefetch(hdr({ "sec-purpose": "prefetch;prerender" }))).toBe(true);
  });

  it("is false for a normal navigation", () => {
    expect(isPrefetch(hdr({ "user-agent": "Mozilla/5.0" }))).toBe(false);
  });
});
