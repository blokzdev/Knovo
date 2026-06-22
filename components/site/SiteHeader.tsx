import Link from "next/link";
import { KnovoWordmark } from "@/components/Logo";

// Shared chrome for the public site. The right-side `account` slot is filled by the reader
// account menu in Phase 1d; until then it stays empty.
export function SiteHeader({ account }: { account?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-3">
        <Link href="/" aria-label="Knovo home">
          <KnovoWordmark />
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/explore" className="rounded-md px-3 py-1.5 text-neutral-600 hover:bg-neutral-100">
            Explore
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">{account}</div>
      </div>
    </header>
  );
}
