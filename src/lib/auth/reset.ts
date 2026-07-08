// Forgot-password flow (docs/REQUIREMENTS §3.12, §6.0, §7). A reset link emails
// a one-time, short-lived, HASHED token. The flow must not reveal whether an
// email exists (no user enumeration), so the request always reports success to
// the caller regardless of whether a token was actually issued.
import type { User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { generateToken, hashToken, normalizeEmail } from "./tokens";

export const RESET_TTL_MINUTES = 45;

/// Issue a reset token for an email, or null if there is no eligible account.
/// The caller must return the SAME response either way (§7). The returned raw
/// token goes only into the emailed link — never stored.
export async function createPasswordResetToken(
  email: string,
): Promise<{ token: string; user: User } | null> {
  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
  if (!user || user.deactivatedAt) return null;

  const token = generateToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TTL_MINUTES * 60_000),
    },
  });
  return { token, user };
}

/// Consume a reset token and set a new password. Rejects an unknown, expired, or
/// already-used token (single-use, §3.12). On success the token is marked used,
/// the password hash is replaced, and ALL of the user's sessions are revoked so
/// a leaked/old session can't outlive the reset (§6.0 sign-out-everywhere).
export async function consumePasswordResetToken(
  token: string,
  newPasswordHash: string,
): Promise<boolean> {
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!row || row.usedAt || row.expiresAt.getTime() <= Date.now()) return false;

  await prisma.$transaction([
    prisma.passwordResetToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: row.userId },
      data: { passwordHash: newPasswordHash },
    }),
    prisma.session.deleteMany({ where: { userId: row.userId } }),
  ]);
  return true;
}

/// Build the emailed reset link from APP_URL (§7 — base URL via env).
export function buildResetUrl(token: string): string {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/reset-password?token=${encodeURIComponent(token)}`;
}
