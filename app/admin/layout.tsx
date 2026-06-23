import type { Metadata } from "next";
import { getAdminContext } from "@/lib/admin/guard";
import { KnovoWordmark } from "@/components/Logo";
import { NavLinks, type NavLink } from "@/components/common/NavLinks";
import { MobileNav } from "@/components/common/MobileNav";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { SignInButton, SignOutButton } from "@/components/admin/AuthButtons";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

const ADMIN_NAV: NavLink[] = [
  { href: "/admin", label: "Queue", exact: true },
  { href: "/admin/library", label: "Library" },
  { href: "/admin/moderation", label: "Discussion" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAdminContext();

  if (!ctx.ok) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted px-6">
        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 text-center shadow-sm">
          <KnovoWordmark className="justify-center" />
          <h1 className="mt-6 text-lg font-semibold">Control HUD</h1>
          {ctx.reason === "unauthenticated" ? (
            <>
              <p className="mt-2 text-sm text-muted-foreground">Sign in to direct the workers.</p>
              <div className="mt-5 flex justify-center">
                <SignInButton />
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              This account isn&apos;t an admin. Ask an existing admin to grant the role.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:gap-4 sm:px-6">
          <MobileNav
            links={ADMIN_NAV}
            className="md:hidden"
            footer={
              <div className="space-y-3">
                <p className="truncate text-xs text-muted-foreground">{ctx.user.email}</p>
                <SignOutButton />
              </div>
            }
          />
          <KnovoWordmark />
          <NavLinks links={ADMIN_NAV} className="ml-2 hidden md:flex" />
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <span className="hidden text-xs text-muted-foreground lg:inline">{ctx.user.email}</span>
            <ThemeToggle />
            <span className="hidden sm:inline-flex">
              <SignOutButton />
            </span>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
      <Toaster />
    </div>
  );
}
