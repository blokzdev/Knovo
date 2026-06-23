import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-8 text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} Knovo</span>
        <nav className="flex flex-wrap gap-4">
          <Link href="/explore" className="hover:text-foreground">
            Explore
          </Link>
          <Link href="/feed.xml" className="hover:text-foreground">
            RSS
          </Link>
          <Link href="/legal/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link href="/legal/terms" className="hover:text-foreground">
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}
