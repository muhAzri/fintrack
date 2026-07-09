// DB-backed, revocable sessions (docs/REQUIREMENTS §3.11, §6.0, §7). The cookie
// carries a random opaque token; only its SHA-256 hash is stored, so a DB leak
// cannot resurrect a session. Sessions are revocable individually (logout) or
// all at once ("sign out everywhere").
import type { Session, User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { addDays } from "@/lib/dates";
import { generateToken, hashToken } from "./tokens";

export const SESSION_TTL_DAYS = 30;

// `lastUsedAt` is a coarse "sliding activity" marker, not an audit log — it does
// not need second-accuracy. Writing it on *every* navigation put a serialized DB
// write on the hot path of each page load; instead we refresh it at most once per
// window, so the vast majority of navigations do zero session writes.
const LAST_USED_REFRESH_MS = 10 * 60 * 1000; // 10 minutes

export interface SessionMeta {
  userAgent?: string | null;
  ip?: string | null;
}

/// Create a session and return the RAW token to put in the cookie. The raw token
/// is never stored — only its hash — so this is the only moment it exists.
export async function createSession(
  userId: string,
  meta: SessionMeta = {},
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken();
  const expiresAt = addDays(new Date(), SESSION_TTL_DAYS);
  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
      userAgent: meta.userAgent ?? null,
      ip: meta.ip ?? null,
    },
  });
  return { token, expiresAt };
}

/// Resolve a raw cookie token to its live session + user, or null. Expired
/// sessions are treated as invalid (and swept); a deactivated user resolves to
/// null (P3). Refreshes lastUsedAt as a sliding-activity marker.
export async function validateSessionToken(
  token: string,
): Promise<{ session: Session; user: User } | null> {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session) return null;

  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  if (session.user.deactivatedAt) return null;

  // Throttle the sliding-activity write off the per-request critical path: only
  // touch the row if it has never been marked, or the marker is older than the
  // refresh window. Best-effort — a failure here must not fail the request.
  const lastUsed = session.lastUsedAt?.getTime() ?? 0;
  if (Date.now() - lastUsed > LAST_USED_REFRESH_MS) {
    await prisma.session
      .update({ where: { id: session.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);
  }

  return { session, user: session.user };
}

/// Revoke a single session by its raw token (logout). Idempotent.
export async function revokeSessionToken(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

/// Revoke every session a user has ("sign out everywhere").
export async function revokeAllSessions(userId: string): Promise<number> {
  const { count } = await prisma.session.deleteMany({ where: { userId } });
  return count;
}
