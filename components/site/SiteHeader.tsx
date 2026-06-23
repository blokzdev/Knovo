import Link from "next/link";
import { KnovoWordmark } from "@/components/Logo";
import { NavLinks, type NavLink } from "@/components/common/NavLinks";
import { ThemeToggle } from "@/components/common/ThemeToggle";

const SITE_NAV: NavLink[] = [{ href: "/explore", label: "Explore" }];

// Shared chrome for the public site. The right-side `account` slot is filled by the reader account
// menu; the theme toggle sits alongside it. (One nav link fits inline at every width, so no drawer.)
export function SiteHeader({ account }: { account?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:gap-6 sm:px-6">
        <Link href="/" aria-label="Knovo home">
          <KnovoWordmark />
        </Link>
        <NavLinks links={SITE_NAV} />
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          {account}
        </div>
      </div>
    </header>
  );
}
