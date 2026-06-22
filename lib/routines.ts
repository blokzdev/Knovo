// Fire a Claude routine worker on demand (the dashboard "run now / do this" control). Uses the
// per-routine API trigger: POST to the routine's /fire URL with its bearer token. The optional
// `text` is freeform context (<=64KB) handed to the worker alongside its saved prompt — e.g.
// "Process the open directive on artifact <id>." Server-only: tokens never reach the browser.
// Docs: https://platform.claude.com/docs/en/api/claude-code/routines-fire

export type WorkerId = "scout" | "editor" | "keeper";

const CONFIG: Record<WorkerId, { urlEnv: string; tokenEnv: string }> = {
  scout: { urlEnv: "ROUTINE_SCOUT_FIRE_URL", tokenEnv: "ROUTINE_SCOUT_TOKEN" },
  editor: { urlEnv: "ROUTINE_EDITOR_FIRE_URL", tokenEnv: "ROUTINE_EDITOR_TOKEN" },
  keeper: { urlEnv: "ROUTINE_KEEPER_FIRE_URL", tokenEnv: "ROUTINE_KEEPER_TOKEN" },
};

export type FireResult = {
  claude_code_session_id: string;
  claude_code_session_url: string;
};

export async function fireWorker(worker: WorkerId, text?: string): Promise<FireResult> {
  const { urlEnv, tokenEnv } = CONFIG[worker];
  const url = process.env[urlEnv];
  const token = process.env[tokenEnv];
  if (!url || !token) {
    throw new Error(`Routine '${worker}' is not configured (set ${urlEnv} and ${tokenEnv}).`);
  }
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
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
