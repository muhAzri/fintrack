// Data Access Layer for auth (docs/REQUIREMENTS §6.0, §7). Security checks live
// as close to the data as possible: every protected page/action resolves the
// user here, and all domain queries are already scoped to that user id (§13.2).
// React's cache() memoizes the session lookup across a single render pass.
import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@prisma/client";
import { readSessionToken } from "./cookie";
import { validateSessionToken } from "./sessions";

/// Resolve the current session (user + session row) from the cookie, or null.
export const getCurrentSession = cache(async () => {
  const token = await readSessionToken();
  if (!token) return null;
  return validateSessionToken(token);
});

/// The current user, or null if unauthenticated.
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const session = await getCurrentSession();
  return session?.user ?? null;
});

/// Require an authenticated user; redirect to /login otherwise. Use at the top
/// of every protected page/layout and mutation.
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
