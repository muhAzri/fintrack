// Auth surface (docs/REQUIREMENTS §6.0, §7). Framework-agnostic core: password
// hashing, opaque-token generation, DB-backed revocable sessions, and the
// forgot-password flow. The Next.js glue (session cookie via next/headers,
// route gating) sits on top of these in the app layer.
import { hashPassword } from "./password";
import { consumePasswordResetToken } from "./reset";

export * from "./errors";
export * from "./password";
export * from "./tokens";
export * from "./sessions";
export * from "./service";
export * from "./reset";

/// Convenience wrapper: hash a new plaintext password and consume the reset
/// token atomically (§6.0). Returns false for an invalid/expired/used token.
export async function resetPasswordWithToken(
  token: string,
  newPassword: string,
): Promise<boolean> {
  const newPasswordHash = await hashPassword(newPassword);
  return consumePasswordResetToken(token, newPasswordHash);
}
