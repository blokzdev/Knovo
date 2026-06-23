# Design system

Canonical reference for Knovo's visual language. The renderer owns artifact layout (see
`foundation/artifact-schema.md`); this doc covers the **app shell + chrome** around it — tokens,
theming, the shared primitives, and the responsive/a11y conventions. Introduced in the PR3
design-system elevation (admin + public; light + dark).

## Tokens (single source of truth)
All colors are HSL CSS variables in `app/globals.css` (`:root` = light, `.dark` = dark), mapped to
Tailwind utilities in `tailwind.config.ts` as `hsl(var(--x))`. **Never hard-code colors** in
components — use the semantic utilities so both themes (and future retints) work for free.

- **Neutrals / surfaces:** `background`, `foreground`, `card`, `popover`, `muted`(+`-foreground`),
  `secondary`(+`-foreground`), `border`, `input`, `ring`.
- **Primary:** `primary`(+`-foreground`) — high-contrast charcoal/near-white for primary actions.
- **Brand:** `brand`(+`-foreground`) — indigo/violet derived from the KnovoMark (junction `#A855F7`,
  icon gradient `#312E81`). Use for links, active nav, focus `ring`, and selected/brand emphasis.
  It is **not** the shadcn `accent` token (that stays the subtle neutral hover surface).
- **Status:** `success` (emerald), `warning` (amber), `info` (sky), `destructive` (red), each with a
  `-foreground`. Use soft as `bg-<x>/10 text-<x>` for badges/alerts, or solid with `-foreground`.
- **Radius:** `--radius` (0.625rem) → `rounded-{sm,md,lg}`.

Multi-state admin badges that need >4 distinct hues (artifact status, flag severity) keep explicit
Tailwind color families **with `dark:` variants** in `lib/admin/labels.ts` — clearer at a glance than
collapsing to the 4 status tokens.

## Theming (light/dark)
- `next-themes` drives a `class` on `<html>` (`app/layout.tsx` → `components/theme-provider.tsx`):
  `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`, persisted, no FOUC
  (`suppressHydrationWarning` on `<html>`).
- Toggle: `components/common/ThemeToggle.tsx` (sun/moon, hydration-safe), in both headers.
- The `sonner` Toaster reads the active theme (`components/ui/sonner.tsx`).
- **Non-CSS surfaces** (recharts SVG attrs, 3Dmol canvas) can't consume `var()`; read concrete
  colors via `lib/use-theme-colors.ts` (`ChartStage`) or branch on `resolvedTheme`
  (`Molecular3DStage` background). Keep old artifacts rendering across both themes.

## Typography
`next/font` (self-hosted, no layout shift) in `app/layout.tsx`: **Inter** → `--font-sans`,
**JetBrains Mono** → `--font-mono` (use `font-mono` for identifiers/IDs/code, e.g. PDB/ChEMBL).

## Shared primitives
- **Chrome:** `components/common/NavLinks` (data-driven, `usePathname` active + `aria-current`),
  `MobileNav` (hamburger → `components/ui/sheet` drawer; Radix-dialog based, focus-trapped),
  `ThemeToggle`. Headers compose these (`app/admin/layout.tsx`, `components/site/SiteHeader.tsx`).
- **Layout:** `components/common/layout.tsx` → `PageHeader`, `SectionHeading`, `EmptyState`,
  `StatCard`.
- **Forms/content:** `components/common/FormField` (label + control + help/error, clones the child to
  wire `id`/`aria-describedby`/`aria-invalid`), `components/common/CodeBlock` (token-styled `<pre>` +
  `CopyButton`), `components/common/Avatar` (image-or-initial; dedupes account + comment avatars).
- Prefer these over re-deriving markup; `components/ui/*` (shadcn) remain the lower-level primitives.

## Responsive & a11y
- Mobile-first; verified at **360 / 768 / 1024 / 1440**. Headers collapse to a drawer below `md`
  (admin) / stay inline (public, single link). Renderer stage heights are fluid (`clamp(...vh...)`).
- Respect `prefers-reduced-motion` (global rule in `globals.css`). Maintain WCAG-AA contrast in both
  themes. Focus-visible rings (brand) everywhere; Radix provides focus trap/escape for Sheet/Dialog.

## Out of scope (roadmap follow-on)
Auth/onboarding, a deep `/legal/*` redesign, and transactional email templates adopt these tokens in
a later design pass (see `foundation/roadmap.md` Phase 3). tldraw `diagram` (PR4) and immersive mode
(PR5) are renderer work, tracked in `docs/renderer-hardening.md`.
