import Link from "next/link";
import { KnovoWordmark } from "@/components/Logo";

// Shared shell for /legal/* pages: brand header, prose container, back link.
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-neutral-200">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <KnovoWordmark />
          <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-900">
            ← Back to Knovo
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12">{children}</main>
      <footer className="mx-auto max-w-3xl px-6 pb-12 text-xs text-neutral-400">
        <nav className="flex gap-4">
          <Link href="/legal/privacy" className="hover:text-neutral-600">
            Privacy
          </Link>
          <Link href="/legal/terms" className="hover:text-neutral-600">
            Terms
          </Link>
        </nav>
      </footer>
    </div>
  );
}
