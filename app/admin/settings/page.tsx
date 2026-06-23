import { getRoutineSettings } from "@/lib/admin/settings";
import { RoutineConfigForm } from "@/components/admin/RoutineConfigForm";
import { RoutineSetupGuide } from "@/components/admin/RoutineSetupGuide";
import { PageHeader } from "@/components/common/layout";

// Admin settings: BYOK config for the worker routine "run now" triggers. Guarded by the admin
// layout; getRoutineSettings() additionally re-checks admin and returns a masked view (no tokens).
export default async function SettingsPage() {
  const settings = await getRoutineSettings();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title="Settings"
        description="Set up each worker routine — copy its paste-ready prompt and connectors into the Claude web app — and wire the dashboard triggers the HUD fires on demand. Tokens are stored securely and never shown again — leave a token blank to keep the current one."
      />
      <RoutineSetupGuide knovoApiBase={settings.knovoApiBase} />
      <RoutineConfigForm settings={settings} />
    </div>
  );
}
