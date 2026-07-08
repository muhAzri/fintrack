import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  authenticate,
  createPasswordResetToken,
  createSession,
  EmailAlreadyInUse,
  registerUser,
  resetPasswordWithToken,
  revokeAllSessions,
  revokeSessionToken,
  validateSessionToken,
} from "@/lib/auth";

const suffix = Date.now();
const emails: string[] = [];

function uniqueEmail(tag: string): string {
  const e = `auth-${tag}-${suffix}@example.com`;
  emails.push(e);
  return e;
}

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
  await prisma.$disconnect();
});

describe("registration & authentication (§6.0, §7)", () => {
  it("registers a user with a hashed password", async () => {
    const email = uniqueEmail("reg");
    const user = await registerUser({ email: email.toUpperCase(), password: "pw-123456" });
    expect(user.email).toBe(email); // normalized to lowercase
    expect(user.passwordHash).toMatch(/^\$argon2id\$/);
  });

  it("rejects a duplicate email with a typed error", async () => {
    const email = uniqueEmail("dup");
    await registerUser({ email, password: "pw-123456" });
    await expect(registerUser({ email, password: "other-pw" })).rejects.toBeInstanceOf(
      EmailAlreadyInUse,
    );
  });

  it("authenticates only with the correct password", async () => {
    const email = uniqueEmail("login");
    await registerUser({ email, password: "right-password" });
    expect(await authenticate(email, "right-password")).not.toBeNull();
    expect(await authenticate(email, "wrong-password")).toBeNull();
    expect(await authenticate(uniqueEmail("nobody"), "right-password")).toBeNull();
  });

  it("refuses a deactivated user (P3)", async () => {
    const email = uniqueEmail("deact");
    const user = await registerUser({ email, password: "pw-123456" });
    await prisma.user.update({ where: { id: user.id }, data: { deactivatedAt: new Date() } });
    expect(await authenticate(email, "pw-123456")).toBeNull();
  });
});

describe("DB-backed sessions (§3.11, §6.0)", () => {
  it("creates, validates, and revokes a session", async () => {
    const user = await registerUser({ email: uniqueEmail("sess"), password: "pw-123456" });
    const { token } = await createSession(user.id, { ip: "127.0.0.1", userAgent: "vitest" });

    // The raw token is never stored — only its hash.
    const stored = await prisma.session.findFirst({ where: { userId: user.id } });
    expect(stored?.tokenHash).toBeDefined();
    expect(stored?.tokenHash).not.toBe(token);

    const resolved = await validateSessionToken(token);
    expect(resolved?.user.id).toBe(user.id);

    await revokeSessionToken(token);
    expect(await validateSessionToken(token)).toBeNull();
  });

  it("treats an expired session as invalid", async () => {
    const user = await registerUser({ email: uniqueEmail("exp"), password: "pw-123456" });
    const { token } = await createSession(user.id);
    await prisma.session.updateMany({
      where: { userId: user.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect(await validateSessionToken(token)).toBeNull();
  });

  it("signs out everywhere", async () => {
    const user = await registerUser({ email: uniqueEmail("all"), password: "pw-123456" });
    const a = await createSession(user.id);
    const b = await createSession(user.id);
    expect(await revokeAllSessions(user.id)).toBe(2);
    expect(await validateSessionToken(a.token)).toBeNull();
    expect(await validateSessionToken(b.token)).toBeNull();
  });
});

describe("forgot-password flow (§3.12, §6.0, §7)", () => {
  it("issues a single-use reset token that changes the password", async () => {
    const email = uniqueEmail("reset");
    await registerUser({ email, password: "old-password" });

    const issued = await createPasswordResetToken(email);
    expect(issued).not.toBeNull();
    const token = issued!.token;

    // Reset works once...
    expect(await resetPasswordWithToken(token, "new-password")).toBe(true);
    expect(await authenticate(email, "new-password")).not.toBeNull();
    expect(await authenticate(email, "old-password")).toBeNull();

    // ...and never again (single-use).
    expect(await resetPasswordWithToken(token, "hacker-password")).toBe(false);
    expect(await authenticate(email, "hacker-password")).toBeNull();
  });

  it("revokes all sessions when the password is reset", async () => {
    const email = uniqueEmail("reset-sess");
    const user = await registerUser({ email, password: "old-password" });
    const { token: sessionToken } = await createSession(user.id);

    const issued = await createPasswordResetToken(email);
    await resetPasswordWithToken(issued!.token, "brand-new-pw");

    expect(await validateSessionToken(sessionToken)).toBeNull();
  });

  it("rejects an expired reset token", async () => {
    const email = uniqueEmail("reset-exp");
    const user = await registerUser({ email, password: "old-password" });
    const issued = await createPasswordResetToken(email);
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect(await resetPasswordWithToken(issued!.token, "np")).toBe(false);
  });

  it("does not reveal whether an email exists (no enumeration, §7)", async () => {
    // An unknown email yields null (caller returns the same generic response).
    expect(await createPasswordResetToken(uniqueEmail("ghost"))).toBeNull();
  });
});
