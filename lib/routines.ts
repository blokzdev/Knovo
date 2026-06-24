// Fire a Claude routine worker on demand (the dashboard "run now / do this" control). Uses the
// per-routine API trigger: POST to the routine's /fire URL with its bearer token. The optional
// `text` is freeform context (<=64KB) handed to the worker alongside its saved prompt — e.g.
// "Process the open directive on artifact <id>." Server-only: tokens never reach the browser.
// Trigger config resolves DB-first (admin-set in /admin/settings), falling back to env vars.
// Docs: https://platform.claude.com/docs/en/api/claude-code/routines-fire

import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowedFireUrl } from "@/lib/routine-url";
import type { WorkerId } from "@/lib/admin/labels";

export type { WorkerId };

const CONFIG: Record<WorkerId, { urlEnv: string; tokenEnv: string }> = {
  scout: { urlEnv: "ROUTINE_SCOUT_FIRE_URL", tokenEnv: "ROUTINE_SCOUT_TOKEN" },
  editor: { urlEnv: "ROUTINE_EDITOR_FIRE_URL", tokenEnv: "ROUTINE_EDITOR_TOKEN" },
  keeper: { urlEnv: "ROUTINE_KEEPER_FIRE_URL", tokenEnv: "ROUTINE_KEEPER_TOKEN" },
};

export type FireResult = {
  claude_code_session_id: string;
  claude_code_session_url: string;
};

// Resolve a worker's fire {url, token}: DB config first (set in /admin/settings), else env. The DB
// row wins only when BOTH fields are present, so the resolved source is unambiguous (this mirrors
// the `source` computed in lib/admin/settings.ts). Returns null when neither source is complete.
async function resolveTrigger(worker: WorkerId): Promise<{ url: string; token: string } | null> {
  const { urlEnv, tokenEnv } = CONFIG[worker];
  try {
    const db = createAdminClient();
    const { data } = await db
      .from("routine_configs")
      .select("fire_url, token")
      .eq("worker", worker)
      .maybeSingle();
    if (data?.fire_url && data.token) return { url: data.fire_url, token: data.token };
  } catch {
    // Table missing (pre-migration) or read error — fall back to env config below.
  }
  const url = process.env[urlEnv];
  const token = process.env[tokenEnv];
  if (url && token) return { url, token };
  return null;
}

export async function fireWorker(worker: WorkerId, text?: string): Promise<FireResult> {
  const trigger = await resolveTrigger(worker);
  if (!trigger) {
    throw new Error(
      `Routine '${worker}' is not configured. Set its trigger in /admin/settings ` +
        `(or via ${CONFIG[worker].urlEnv} / ${CONFIG[worker].tokenEnv}).`,
    );
  }
  // Defense in depth: never POST the bearer token to a non-Claude host, even if a bad value was stored.
  if (!isAllowedFireUrl(trigger.url)) {
    throw new Error(
      `Routine '${worker}' fire URL is not an allowed Claude API URL — refusing to send the token.`,
    );
  }
  const res = await fetch(trigger.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${trigger.token}`,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "experimental-cc-routine-2026-04-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(text ? { text: text.slice(0, 65536) } : {}),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Firing routine '${worker}' failed (${res.status}): ${detail}`);
  }
  return (await res.json()) as FireResult;
}
