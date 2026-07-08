import { describe, expect, it } from "vitest";
import { generateToken, hashToken, normalizeEmail, tokenHashEquals } from "@/lib/auth/tokens";

describe("opaque tokens (§7, §3.11–§3.12)", () => {
  it("generates URL-safe, unique, high-entropy tokens", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/); // base64url, no padding
    expect(a.length).toBeGreaterThanOrEqual(43); // 32 bytes → 43 chars
  });

  it("hashes deterministically to a 64-char hex SHA-256", () => {
    const raw = generateToken();
    expect(hashToken(raw)).toBe(hashToken(raw));
    expect(hashToken(raw)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken("a")).not.toBe(hashToken("b"));
  });

  it("compares hashes in constant time", () => {
    const h = hashToken("token");
    expect(tokenHashEquals(h, h)).toBe(true);
    expect(tokenHashEquals(h, hashToken("other"))).toBe(false);
  });
});

describe("normalizeEmail (§3.10)", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  User@Example.COM ")).toBe("user@example.com");
  });
});
