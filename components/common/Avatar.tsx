import { cn } from "@/lib/utils";

// Round avatar: shows the image when present, else the name's initial. Token-driven so it works in
// both themes. Default size h-8 w-8; override via className. Dedupes the AccountMenu + CommentItem copies.
export function Avatar({ name, src, className }: { name?: string | null; src?: string | null; className?: string }) {
  const initial = ((name ?? "").trim()[0] ?? "?").toUpperCase();
  return (
    <span
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-sm font-medium text-muted-foreground",
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        initial
      )}
    </span>
  );
}
