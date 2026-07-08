import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password hashing (§7)", () => {
  it("produces an argon2id hash, never plaintext", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(hash).not.toContain("correct horse");
  });

  it("verifies the right password and rejects the wrong one", async () => {
    const hash = await hashPassword("s3cret-pass");
    expect(await verifyPassword(hash, "s3cret-pass")).toBe(true);
    expect(await verifyPassword(hash, "s3cret-Pass")).toBe(false);
    expect(await verifyPassword(hash, "")).toBe(false);
  });

  it("salts: the same password hashes to different digests", async () => {
    const a = await hashPassword("same-password");
    const b = await hashPassword("same-password");
    expect(a).not.toBe(b);
    expect(await verifyPassword(a, "same-password")).toBe(true);
    expect(await verifyPassword(b, "same-password")).toBe(true);
  });
});
