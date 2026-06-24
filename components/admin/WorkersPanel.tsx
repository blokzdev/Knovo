import { createClient } from "@/lib/supabase/server";
import { getRoutineSettings } from "@/lib/admin/settings";
import { deriveWorkerStatus, type LastRun } from "@/lib/admin/worker-state";
import type { WorkerId } from "@/lib/admin/labels";
import { WorkerCard } from "./WorkerCard";

const WORKERS: WorkerId[] = ["scout", "editor", "keeper"];

// Dashboard dispatch panel. State-aware: each worker's card reflects whether its routine is wired,
// not-yet-configured, or broken (from getRoutineSettings' `source` + the latest routine_runs row),
// so the action gates gracefully instead of firing an unconfigured worker into an error toast.
export async function WorkersPanel() {
  const supabase = createClient();
  // Fetch the latest run PER worker deterministically (one tiny query each), so a chatty worker can't
  // push a quieter worker's last run out of a shared window and mask its real state.
  const [settings, ...runResults] = await Promise.all([
    getRoutineSettings(),
    ...WORKERS.map((w) =>
      supabase
        .from("routine_runs")
        .select("status, started_at, session_url, error")
        .eq("worker", w)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ),
  ]);

  const latest = new Map<string, LastRun>();
  WORKERS.forEach((w, i) => latest.set(w, (runResults[i]?.data ?? null) as LastRun));
  const byWorker = new Map(settings.routines.map((s) => [s.worker, s]));

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {WORKERS.map((w) => {
        const setting = byWorker.get(w);
        const status = deriveWorkerStatus(
          { source: setting?.source ?? "none", fireUrlValid: setting?.fireUrlValid ?? false },
          latest.get(w) ?? null,
        );
        return <WorkerCard key={w} worker={w} status={status} />;
      })}
    </div>
  );
}
