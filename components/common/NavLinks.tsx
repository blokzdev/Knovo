"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type NavLink = { href: string; label: string; exact?: boolean };

export function isActivePath(pathname: string, link: NavLink): boolean {
  if (link.exact) return pathname === link.href;
  return pathname === link.href || pathname.startsWith(`${link.href}/`);
}

// Data-driven nav, shared by the admin + public headers and the mobile drawer. Active link is
// brand-tinted with aria-current. `orientation="vertical"` + larger tap targets for the drawer.
export function NavLinks({
  links,
  orientation = "horizontal",
  onNavigate,
  className,
}: {
  links: NavLink[];
  orientation?: "horizontal" | "vertical";
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const vertical = orientation === "vertical";
  return (
    <nav
      className={cn(
        "items-stretch text-sm",
        vertical ? "flex flex-col gap-1" : "flex items-center gap-1",
        className,
      )}
    >
      {links.map((link) => {
        const active = isActivePath(pathname, link);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            className={cn(
              "rounded-md px-3 font-medium transition-colors",
              vertical ? "py-2.5" : "py-1.5",
              active
                ? "bg-brand/10 text-brand"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
