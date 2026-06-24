import Link from "next/link";
import { cn, focusRing, timeAgo } from "@/lib/utils";
import { ActorBadge, type ProfileMap } from "./ActorBadge";
import { ActionChip } from "./ActionChip";
import { ActivityDetail } from "./DetailRenderer";

export type ActivityRowData = {
  id: string;
  actor: string | null;
  action: string;
  created_at: string;
  detail?: unknown;
};

// The single canonical activity row (replaces the two duplicated inline renderers). Mobile-first:
// chips + detail flow on top, the relative time drops to its own line on <sm and pins right at sm+.
// Never wraps the timestamp (the old bug). Optionally a link, and an optional right-aligned slot
// (e.g. a kebab menu) injected by the caller.
export function ActivityRow({
  row,
  profiles,
  currentUserId,
  href,
  rightSlot,
  className,
}: {
  row: ActivityRowData;
  profiles?: ProfileMap;
  currentUserId?: string;
  href?: string;
  rightSlot?: React.ReactNode;
  className?: string;
}) {
  const body = (
    <div
      className={cn(
        "flex flex-col gap-1.5 px-4 py-2.5 sm:flex-row sm:items-start sm:gap-3",
        href && "transition-colors hover:bg-muted/40",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1.5">
        <ActorBadge actor={row.actor} profiles={profiles} currentUserId={currentUserId} />
        <ActionChip action={row.action} />
        {row.detail !== undefined && <ActivityDetail action={row.action} detail={row.detail} />}
      </div>
      <div className="flex items-center gap-1 sm:shrink-0">
        {rightSlot}
        <time
          dateTime={row.created_at}
          title={new Date(row.created_at).toLocaleString()}
          className="whitespace-nowrap text-xs tabular-nums text-muted-foreground"
        >
          {timeAgo(row.created_at)}
        </time>
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className={cn("block rounded-md", focusRing)}>
      {body}
    </Link>
  ) : (
    body
  );
}
