"use client";

import * as React from "react";
import { Menu } from "lucide-react";
import { KnovoWordmark } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NavLinks, type NavLink } from "./NavLinks";

// Hamburger → left drawer for small screens. Closes on navigation. `footer` holds context actions
// (e.g. sign-out, account) so the whole nav lives in one place on mobile.
export function MobileNav({
  links,
  footer,
  className,
}: {
  links: NavLink[];
  footer?: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className={className} aria-label="Open menu">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <div className="flex h-full flex-col">
          <KnovoWordmark />
          <div className="mt-6 flex-1">
            <NavLinks links={links} orientation="vertical" onNavigate={() => setOpen(false)} />
          </div>
          {footer && <div className="mt-4 border-t border-border pt-4">{footer}</div>}
        </div>
      </SheetContent>
    </Sheet>
  );
}
