import { requireAdmin } from "./guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowedFireUrl } from "@/lib/routine-url";
import type { WorkerId } from "@/lib/routines";

// Server-only reader for the admin settings page. NOT a "use server" action: keeping it a plain
// module means the masked view (and the never-exposed token) stay off the client-callable RPC
// surface. The page imports this directly; the form receives only the masked shape below.

const WORKERS: WorkerId[] = ["scout", "editor", "keeper"];
const ENV: Record<WorkerId, { url: string; token: string }> = {
  scout: { url: "ROUTINE_SCOUT_FIRE_URL", token: "ROUTINE_SCOUT_TOKEN" },
  editor: { url: "ROUTINE_EDITOR_FIRE_URL", token: "ROUTINE_EDITOR_TOKEN" },
  keeper: { url: "ROUTINE_KEEPER_FIRE_URL", token: "ROUTINE_KEEPER_TOKEN" },
};

// Where dispatch will actually resolve the trigger from (mirrors fireWorker's resolveTrigger):
// 'db' when both fire_url + token are stored, else 'env' when both env vars are set, else 'none'.
export type ConfigSource = "db" | "env" | "none";

export type RoutineSetting = {
  worker: WorkerId;
  fireUrl: string;
  hasToken: boolean;
  tokenLast4: string | null;
  source: ConfigSource;
  // Whether the resolved fire URL (db OR env) passes the Claude-host allowlist. Computed server-side
  // so the dashboard can flag a misconfigured trigger WITHOUT ever shipping the env URL to the client.
  fireUrlValid: boolean;
  updatedAt: string | null;
};

export type RoutineSettings = {
  routines: RoutineSetting[];
  knovoApiBase: string;
};

export async function getRoutineSettings(): Promise<RoutineSettings> {
  await requireAdmin();
  const db = createAdminClient();

  const { data: rows } = await db
    .from("routine_configs")
    .select("worker, fire_url, token, updated_at");
  const { data: setting } = await db
    .from("app_settings")
    .select("value")
    .eq("key", "knovo_api_base")
    .maybeSingle();

  const byWorker = new Map((rows ?? []).map((r) => [r.worker, r]));

  const routines: RoutineSetting[] = WORKERS.map((worker) => {
    const row = byWorker.get(worker);
    const dbUrl = row?.fire_url ?? null;
    const dbToken = row?.token ?? null;
    const envUrl = process.env[ENV[worker].url];
    const envComplete = !!envUrl && !!process.env[ENV[worker].token];
    const source: ConfigSource = dbUrl && dbToken ? "db" : envComplete ? "env" : "none";
    // Validate whichever URL dispatch will actually use (fireWorker checks both db + env the same way).
    const fireUrlValid =
      source === "db" ? isAllowedFireUrl(dbUrl ?? "") : source === "env" ? isAllowedFireUrl(envUrl ?? "") : false;
    return {
      worker,
      fireUrl: dbUrl ?? "",
      hasToken: !!dbToken,
      // Masked: only the last 4 chars ever leave the server, never the token itself.
      tokenLast4: dbToken ? dbToken.slice(-4) : null,
      source,
      fireUrlValid,
      updatedAt: row?.updated_at ?? null,
    };
  });

  const knovoApiBase = setting?.value ?? process.env.KNOVO_API_BASE ?? "";
  return { routines, knovoApiBase };
}
