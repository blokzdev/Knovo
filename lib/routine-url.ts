// Pure validator for routine fire-trigger URLs. Shared by the dashboard form (client component),
// the save action, and fireWorker (server). No imports → safe to bundle in the browser. The
// dashboard POSTs a bearer token to this URL, so we hard-restrict it to https + the Claude /
// Anthropic API host family: a mistyped or pasted-wrong URL must not be able to exfiltrate the token.
const ALLOWED_HOSTS = ["anthropic.com", "claude.com"];
const ALLOWED_HOST_SUFFIXES = [".anthropic.com", ".claude.com"];

export function isAllowedFireUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  const host = parsed.hostname.toLowerCase();
  return ALLOWED_HOSTS.includes(host) || ALLOWED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

// One source of truth for the user-facing requirement string (reused by the action + the form).
export const FIRE_URL_REQUIREMENT =
  "Fire URL must be an https Claude API URL (anthropic.com or claude.com).";
