// Pure navigation helpers, framework-free so they're unit-testable (NavLinks is a "use client"
// component and can't be imported under the node vitest glob). See components/common/NavLinks.tsx.
export type NavLink = { href: string; label: string; exact?: boolean };

// Whether `pathname` should mark `link` active. Exact links match only themselves; otherwise the
// link matches its own path and any descendant (`/admin/library` → `/admin/library/123`), but the
// `${href}/` boundary prevents sibling false-positives (`/admin/librarian`).
export function isActivePath(pathname: string, link: NavLink): boolean {
  if (link.exact) return pathname === link.href;
  return pathname === link.href || pathname.startsWith(`${link.href}/`);
}
