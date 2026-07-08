// Opaque token generation & hashing (docs/REQUIREMENTS §6.0, §7, §3.11–§3.12).
//
// The client (cookie / reset link) only ever holds a RANDOM OPAQUE token. The
// database stores only its SHA-256 hash, so a DB leak cannot resurrect a live
// session or replay a reset link. SHA-256 is appropriate here (unlike for
// passwords) because the token is high-entropy random, not a low-entropy secret.
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/// A 256-bit URL-safe random token for cookies and reset links.
export function generateToken(byteLength = 32): string {
  return randomBytes(byteLength).toString("base64url");
}

/// SHA-256 hex digest of a raw token — this is what gets persisted.
export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/// Constant-time comparison of two token hashes (hex strings of equal length).
export function tokenHashEquals(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/// Normalize an email for storage and lookup: trimmed + lowercased. Keeps the
/// unique index and login lookups consistent (§3.10).
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
