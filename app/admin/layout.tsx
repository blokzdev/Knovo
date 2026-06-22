import type { Metadata } from "next";
import Link from "next/link";
import { getAdminContext } from "@/lib/admin/guard";
import { KnovoWordmark } from "@/components/Logo";
import { SignInButton, SignOutButton } from "@/components/admin/AuthButtons";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAdminContext();

  if (!ctx.ok) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-6">
        <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
          <KnovoWordmark className="justify-center" />
          <h1 className="mt-6 text-lg font-semibold">Control HUD</h1>
          {ctx.reason === "unauthenticated" ? (
            <>
              <p className="mt-2 text-sm text-neutral-600">Sign in to direct the workers.</p>
              <div className="mt-5 flex justify-center">
                <SignInButton />
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-neutral-600">
              This account isn&apos;t an admin. Ask an existing admin to grant the role.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
          <KnovoWordmark />
          <nav className="flex items-center gap-1 text-sm">
            <Link href="/admin" className="rounded-md px-3 py-1.5 text-neutral-600 hover:bg-neutral-100">
              Queue
            </Link>
            <Link href="/admin/library" className="rounded-md px-3 py-1.5 text-neutral-600 hover:bg-neutral-100">
              Library
            </Link>
            <Link href="/admin/moderation" className="rounded-md px-3 py-1.5 text-neutral-600 hover:bg-neutral-100">
              Discussion
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs text-neutral-400 sm:inline">{ctx.user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      <Toaster />
    </div>
  );
}
