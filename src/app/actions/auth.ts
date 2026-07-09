"use server";

// Auth server actions (docs/REQUIREMENTS §6.0, §7). Always run on the server, so
// they are a safe place for credential handling. Responses never reveal whether
// an email exists (no user enumeration, §7): login and reset are generic, and a
// duplicate registration returns a non-committal message.
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import {
  authenticate,
  buildResetUrl,
  createPasswordResetToken,
  EmailAlreadyInUse,
  registerUser,
  resetPasswordWithToken,
  UsernameAlreadyInUse,
} from "@/lib/auth";
import { endSession, startSession } from "@/lib/auth/cookie";
import { seedChartOfAccounts } from "@/lib/accounts";
import { sendPasswordResetEmail } from "@/lib/mail";

export interface FormState {
  error?: string;
  message?: string;
}

async function sessionMeta() {
  const h = await headers();
  return { userAgent: h.get("user-agent"), ip: h.get("x-forwarded-for") };
}

const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  name: z.string().trim().min(1).optional(),
});

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getTranslations("auth");
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name") || undefined,
  });
  if (!parsed.success) {
    return { error: t("errRegisterInvalid") };
  }

  try {
    const user = await registerUser(parsed.data);
    await seedChartOfAccounts(user.id); // onboarding: default chart of accounts (§4)
    await startSession(user.id, await sessionMeta());
  } catch (err) {
    if (err instanceof EmailAlreadyInUse || err instanceof UsernameAlreadyInUse) {
      // Do not confirm the email exists (§7). Point them at logging in instead.
      return { error: t("errRegisterFailed") };
    }
    return { error: t("errGeneric") };
  }
  redirect("/dashboard");
}

const loginSchema = z.object({ email: z.email(), password: z.string().min(1) });

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getTranslations("auth");
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: t("errInvalidCredentials") };

  const user = await authenticate(parsed.data.email, parsed.data.password);
  if (!user) return { error: t("errInvalidCredentials") };

  await startSession(user.id, await sessionMeta());
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/login");
}

const emailSchema = z.object({ email: z.email() });

export async function requestResetAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getTranslations("auth");
  // Identical response whether or not the email exists (§7 no enumeration).
  const generic = { message: t("resetSent") };
  const parsed = emailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return generic;

  try {
    const issued = await createPasswordResetToken(parsed.data.email);
    if (issued) {
      const url = buildResetUrl(issued.token);
      try {
        await sendPasswordResetEmail(issued.user.email, url);
      } catch {
        // In dev without SMTP configured, surface the link in the server log.
        console.warn("[reset] email not sent; reset link:", url);
      }
    }
  } catch {
    // swallow — never leak whether the lookup found anything
  }
  return generic;
}

const resetSchema = z.object({ token: z.string().min(1), password: z.string().min(8) });

export async function resetAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const t = await getTranslations("auth");
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: t("errPasswordShort") };

  const ok = await resetPasswordWithToken(parsed.data.token, parsed.data.password);
  if (!ok) return { error: t("errResetInvalid") };

  redirect("/login?reset=1");
}
