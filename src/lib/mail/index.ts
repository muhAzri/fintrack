// Transactional email over SMTP (docs/REQUIREMENTS §7). Used for the
// password-reset link now, and email verification later. SMTP credentials come
// from the environment (never committed).
import nodemailer, { type Transporter } from "nodemailer";

let cachedTransport: Transporter | null = null;

function getTransport(): Transporter {
  if (cachedTransport) return cachedTransport;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!host) {
    throw new Error("SMTP is not configured (set SMTP_HOST etc. — see .env.example)");
  }

  cachedTransport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // implicit TLS on 465; STARTTLS otherwise
    auth: user ? { user, pass } : undefined,
  });
  return cachedTransport;
}

function fromAddress(): string {
  return process.env.SMTP_FROM ?? "Fintrack <no-reply@example.com>";
}

/// Email a password-reset link (§6.0). The link embeds the one-time token.
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  await getTransport().sendMail({
    from: fromAddress(),
    to,
    subject: "Reset your Fintrack password",
    text:
      `We received a request to reset your Fintrack password.\n\n` +
      `Reset it here (link expires shortly): ${resetUrl}\n\n` +
      `If you didn't request this, you can safely ignore this email.`,
    html:
      `<p>We received a request to reset your Fintrack password.</p>` +
      `<p><a href="${resetUrl}">Reset your password</a> (link expires shortly).</p>` +
      `<p>If you didn't request this, you can safely ignore this email.</p>`,
  });
}
