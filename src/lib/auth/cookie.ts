// Session cookie glue for the Next.js app layer (docs/REQUIREMENTS §6.0, §7).
// The httpOnly + SameSite cookie carries the opaque session token; only its hash
// lives in the DB (see ./sessions). Setting/deleting cookies is only valid in a
// Server Action or Route Handler (Next: cookies() is async).
import { cookies } from "next/headers";
import { createSession, revokeSessionToken, type SessionMeta } from "./sessions";

export const SESSION_COOKIE = "fintrack_session";

/// Create a DB session and drop its opaque token into the cookie (§6.0).
export async function startSession(userId: string, meta?: SessionMeta): Promise<void> {
  const { token, expiresAt } = await createSession(userId, meta);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // http on localhost dev
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

/// Revoke the current DB session and clear the cookie (logout).
export async function endSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await revokeSessionToken(token);
  store.delete(SESSION_COOKIE);
}

export async function readSessionToken(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}
