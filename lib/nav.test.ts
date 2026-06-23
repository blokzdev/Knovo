import { describe, it, expect } from "vitest";
import { isActivePath, type NavLink } from "./nav";

describe("isActivePath", () => {
  it("exact links match only the exact path", () => {
    const link: NavLink = { href: "/admin", label: "Queue", exact: true };
    expect(isActivePath("/admin", link)).toBe(true);
    expect(isActivePath("/admin/library", link)).toBe(false);
    expect(isActivePath("/admin/", link)).toBe(false);
  });

  it("prefix links match the path and its subtree", () => {
    const link: NavLink = { href: "/admin/library", label: "Library" };
    expect(isActivePath("/admin/library", link)).toBe(true);
    expect(isActivePath("/admin/library/123", link)).toBe(true);
    expect(isActivePath("/admin", link)).toBe(false);
  });

  it("does not match sibling paths that merely share a prefix string", () => {
    const link: NavLink = { href: "/admin/library", label: "Library" };
    expect(isActivePath("/admin/librarian", link)).toBe(false);
  });
});
