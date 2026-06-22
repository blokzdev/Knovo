import { STATUS_META, type Status } from "@/lib/admin/labels";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const m = STATUS_META[status] ?? { label: status, cls: "bg-neutral-100 text-neutral-700 border-neutral-200" };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        m.cls,
        className,
      )}
    >
      {m.label}
    </span>
  );
}
