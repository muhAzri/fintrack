// Password hashing (docs/REQUIREMENTS §7, §6.0). Passwords are stored ONLY as
// an argon2id hash — never plaintext or reversible encryption.
import { hash, verify } from "@node-rs/argon2";

// argon2id with OWASP-recommended parameters (m = 19 MiB, t = 2, p = 1).
// `algorithm: 2` is Algorithm.Argon2id — spelled as the literal because the
// package exports it as a `const enum`, which cannot be imported as a value
// under `isolatedModules`.
const ARGON2_OPTIONS = {
  algorithm: 2,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

/// Hash a plaintext password into an argon2id encoded string (salt embedded).
export function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON2_OPTIONS);
}

/// Verify a plaintext password against a stored argon2id hash. The parameters
/// are read from the encoded hash, so old hashes keep verifying after a params
/// bump.
export function verifyPassword(hashed: string, plain: string): Promise<boolean> {
  return verify(hashed, plain);
}
