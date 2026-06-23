import * as React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Page title + optional subtitle + optional right-aligned actions. Matches the HUD heading scale.
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionHeading({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={cn("text-sm font-semibold text-foreground", className)}>{children}</h2>;
}

// Dashed-border placeholder for empty lists/sections.
export function EmptyState({
  children,
  icon,
  className,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground",
        className,
      )}
    >
      {icon && <div className="mb-2 flex justify-center text-muted-foreground/70">{icon}</div>}
      {children}
    </div>
  );
}

// Count + label tile (optionally a link). Used by the dashboard status summary.
export function StatCard({
  label,
  value,
  href,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  href?: string;
  className?: string;
}) {
  const card = (
    <Card className={cn("h-full transition-colors", href && "hover:border-foreground/20", className)}>
      <CardContent className="p-3">
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
  return href ? (
    <Link href={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl">
      {card}
    </Link>
  ) : (
    card
  );
}
