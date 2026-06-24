import { createClient } from "@/lib/supabase/server";
import { getRoutineSettings } from "@/lib/admin/settings";
import { RoutineConfigForm } from "@/components/admin/RoutineConfigForm";
import { RoutineSetupGuide } from "@/components/admin/RoutineSetupGuide";
import { RecentRunsPanel, type RunSummary } from "@/components/admin/RecentRunsPanel";
import { PageHeader } from "@/components/common/layout";
import type { WorkerId } from "@/lib/admin/labels";

export const dynamic = "force-dynamic";

const WORKERS: WorkerId[] = ["scout", "editor", "keeper"];

// Admin settings: BYOK config for the worker routine "run now" triggers. Guarded by the admin
// layout; getRoutineSettings() additionally re-checks admin and returns a masked view (no tokens).
// `?worker=<id>` (from the dashboard card CTAs) opens that worker's tab and scrolls it into view.
export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: { worker?: string };
}) {
  const supabase = createClient();
  const initialWorker = WORKERS.includes(searchParams?.worker as WorkerId)
    ? (searchParams!.worker as WorkerId)
    : undefined;
  const [settings, { data: runs }] = await Promise.all([
    getRoutineSettings(),
    supabase
      .from("routine_runs")
      .select("id, worker, status, session_url, started_at, artifact_id")
      .order("started_at", { ascending: false })
      .limit(15),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title="Settings"
        description="Set up each worker routine — copy its paste-ready prompt and connectors into the Claude web app — and wire the dashboard triggers the HUD fires on demand. Tokens are stored securely and never shown again — leave a token blank to keep the current one."
      />
      <RoutineSetupGuide knovoApiBase={settings.knovoApiBase} />
      {/* key on the deep-link target so changing ?worker= remounts the form and re-applies the tab
          (Radix Tabs defaultValue is uncontrolled — it only honors the initial value otherwise). */}
      <RoutineConfigForm key={initialWorker ?? "default"} settings={settings} initialWorker={initialWorker} />
      <RecentRunsPanel runs={(runs ?? []) as RunSummary[]} />
    </div>
  );
}
