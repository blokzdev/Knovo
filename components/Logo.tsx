import Link from "next/link";

// Knovo brand mark: a stylized "K" built from a molecular graph — three nodes
// (atoms) joined by bonds, evoking structure/de-novo design. One source of truth
// for the mark; the wordmark composes it with the name.

export function KnovoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label="Knovo"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="knovo-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4F46E5" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#knovo-grad)" />
      {/* bonds */}
      <g stroke="#fff" strokeWidth="2.1" strokeLinecap="round">
        <line x1="11" y1="8" x2="11" y2="24" />
        <line x1="11" y1="16" x2="22" y2="8" />
        <line x1="11" y1="16" x2="22" y2="24" />
      </g>
      {/* nodes (atoms) */}
      <g fill="#fff">
        <circle cx="11" cy="8" r="2.4" />
        <circle cx="11" cy="24" r="2.4" />
        <circle cx="22" cy="8" r="2.4" />
        <circle cx="22" cy="24" r="2.4" />
        <circle cx="11" cy="16" r="2.4" />
      </g>
    </svg>
  );
}

export function KnovoWordmark({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2 ${className}`}>
      <KnovoMark className="h-7 w-7" />
      <span className="text-lg font-semibold tracking-tight text-neutral-900">Knovo</span>
    </Link>
  );
}
