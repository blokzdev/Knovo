import { describe, it, expect } from "vitest";
import { isAllowedFireUrl } from "./routine-url";

describe("isAllowedFireUrl", () => {
  it("accepts https Claude / Anthropic API hosts", () => {
    expect(isAllowedFireUrl("https://api.anthropic.com/v1/routines/abc/fire")).toBe(true);
    expect(isAllowedFireUrl("https://platform.claude.com/x/fire")).toBe(true);
    expect(isAllowedFireUrl("https://api.claude.com/fire")).toBe(true);
    expect(isAllowedFireUrl("https://claude.com/fire")).toBe(true);
    expect(isAllowedFireUrl("  https://api.anthropic.com/fire  ")).toBe(true);
  });

  it("rejects non-https schemes (token must not travel in cleartext)", () => {
    expect(isAllowedFireUrl("http://api.anthropic.com/fire")).toBe(false);
    expect(isAllowedFireUrl("ftp://api.anthropic.com/fire")).toBe(false);
  });

  it("rejects non-allowlisted and look-alike hosts", () => {
    expect(isAllowedFireUrl("https://evil.example.com/fire")).toBe(false);
    expect(isAllowedFireUrl("https://anthropic.com.evil.com/fire")).toBe(false);
    expect(isAllowedFireUrl("https://notclaude.com/fire")).toBe(false);
  });

  it("rejects junk", () => {
    expect(isAllowedFireUrl("not a url")).toBe(false);
    expect(isAllowedFireUrl("")).toBe(false);
  });
});
