// Registration & authentication (docs/REQUIREMENTS §6.0, §7). All financial
// data is scoped per user (§13.2); this is where users come into being and
// prove who they are.
import { Prisma, type User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { EmailAlreadyInUse, UsernameAlreadyInUse } from "./errors";
import { hashPassword, verifyPassword } from "./password";
import { normalizeEmail } from "./tokens";

export interface RegisterInput {
  email: string;
  password: string;
  username?: string | null;
  name?: string | null;
}

/// Create a user with an argon2id password hash (§7). Throws EmailAlreadyInUse /
/// UsernameAlreadyInUse on a unique-constraint clash; the caller decides how to
/// respond without leaking which field collided (§7 no enumeration).
export async function registerUser(input: RegisterInput): Promise<User> {
  const passwordHash = await hashPassword(input.password);
  try {
    return await prisma.user.create({
      data: {
        email: normalizeEmail(input.email),
        username: input.username?.trim() || null,
        name: input.name?.trim() || null,
        passwordHash,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const target = (err.meta?.target as string[] | string | undefined) ?? "";
      if (String(target).includes("username")) throw new UsernameAlreadyInUse();
      throw new EmailAlreadyInUse();
    }
    throw err;
  }
}

/// Verify an email + password pair, returning the user or null. Runs a hash even
/// when the email is unknown so response timing does not reveal whether an
/// account exists (§7). A deactivated user cannot authenticate (P3).
export async function authenticate(email: string, password: string): Promise<User | null> {
  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
  if (!user || user.deactivatedAt) {
    // Burn comparable CPU to equalize timing against the "user found" path.
    await hashPassword(password).catch(() => undefined);
    return null;
  }
  const ok = await verifyPassword(user.passwordHash, password);
  return ok ? user : null;
}
