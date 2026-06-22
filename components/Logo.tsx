import Link from "next/link";

// Knovo brand mark: a stylized "K" built from a molecular graph — three nodes
// (atoms) joined by bonds, evoking structure/de-novo design. One source of truth
// for the mark; the wordmark composes it with the name.

// The five atoms of the "K", each a distinct, evenly-spaced hue. One source of
// truth for the palette — shared by the favicon and apple-icon (keep in sync).
const KNOVO_NODES = [
  { cx: 11, cy: 8, color: "#A855F7" }, // violet — top of the spine
  { cx: 11, cy: 16, color: "#FBBF24" }, // amber — junction
  { cx: 11, cy: 24, color: "#34D399" }, // emerald — foot of the spine
  { cx: 22, cy: 8, color: "#38BDF8" }, // sky — upper arm
  { cx: 22, cy: 24, color: "#FB7185" }, // rose — lower arm
] as const;

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
          <stop offset="0" stopColor="#312E81" />
          <stop offset="1" stopColor="#0B1120" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#knovo-grad)" />
      {/* bonds */}
      <g stroke="#FFFFFF" strokeOpacity="0.45" strokeWidth="1.8" strokeLinecap="round">
        <line x1="11" y1="8" x2="11" y2="24" />
        <line x1="11" y1="16" x2="22" y2="8" />
        <line x1="11" y1="16" x2="22" y2="24" />
      </g>
      {/* nodes: white padding ring + colored core */}
      {KNOVO_NODES.map((n) => (
        <g key={`${n.cx}-${n.cy}`}>
          <circle cx={n.cx} cy={n.cy} r="3" fill="#FFFFFF" />
          <circle cx={n.cx} cy={n.cy} r="2" fill={n.color} />
        </g>
      ))}
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
