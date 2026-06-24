import { cn } from "@/lib/utils";
import { TONES } from "@/lib/admin/labels";
import { parseActor } from "@/lib/admin/activity";
import { ADMIN_ICON, SYSTEM_ICON, WORKER_ICONS } from "./icons";

// Server-safe (no hooks / no Radix). Admin uuids resolve to a display name via a profiles map that
// the page injects server-side (admin RLS context) — this component never queries the database.
export type ProfileMap = Record<string, { display_name: string | null; email: string | null }>;

export function ActorBadge({
  actor,
  profiles,
  currentUserId,
  showIcon = true,
  className,
}: {
  actor: string | null | undefined;
  profiles?: ProfileMap;
  currentUserId?: string;
  showIcon?: boolean;
  className?: string;
}) {
  const info = parseActor(actor);
  const Icon = info.kind === "worker" ? WORKER_ICONS[info.worker] : info.kind === "admin" ? ADMIN_ICON : SYSTEM_ICON;
  const tone = info.kind === "worker" ? info.tone : info.kind === "admin" ? "brand" : "zinc";

  let label: string;
  if (info.kind === "worker") label = info.label;
  else if (info.kind === "admin") {
    const p = profiles?.[info.id];
    label = info.id === currentUserId ? "You" : p?.display_name || p?.email || "Admin";
  } else label = info.label;

  return (
    <span
      title={actor ?? undefined}
      className={cn(
        "inline-flex max-w-[12rem] items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
    >
      {showIcon && <Icon className="h-3 w-3 shrink-0" aria-hidden />}
      <span className="truncate">{label}</span>
    </span>
  );
}
