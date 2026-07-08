// Zod input schemas for account management (docs/REQUIREMENTS §6.1, §3.1, §3.5).
import { z } from "zod";
import { isSubtypeCompatible, isCreditSubtype } from "./subtype";

const decimalString = z
  .string()
  .regex(/^\d+(\.\d+)?$/, "must be a non-negative decimal ratio, e.g. \"0.0175\"");

/// Billing parameters for a credit card / paylater (§3.5). Exactly one of
/// dueDay / dueOffsetDays must be set.
export const creditParamsSchema = z
  .object({
    instrument: z.enum(["CREDIT_CARD", "PAYLATER"]),
    creditLimit: z.bigint().min(0n).nullish(),
    statementDay: z.number().int().min(1).max(31),
    dueDay: z.number().int().min(1).max(31).nullish(),
    dueOffsetDays: z.number().int().min(1).max(90).nullish(),
    gracePeriodDays: z.number().int().min(0).max(90).nullish(),
    interestRateMonthly: decimalString,
    minPaymentRate: decimalString.nullish(),
    minPaymentFloor: z.bigint().min(0n).nullish(),
    lateFee: z.bigint().min(0n).nullish(),
  })
  .refine((p) => (p.dueDay != null) !== (p.dueOffsetDays != null), {
    message: "exactly one of dueDay / dueOffsetDays must be set (§3.5)",
    path: ["dueDay"],
  });

export type CreditParamsInput = z.infer<typeof creditParamsSchema>;

export const createAccountSchema = z
  .object({
    name: z.string().min(1).max(80),
    type: z.enum(["ASSET", "LIABILITY", "INCOME", "EXPENSE", "EQUITY"]),
    subtype: z
      .enum([
        "CASH",
        "BANK",
        "EWALLET",
        "RECEIVABLE",
        "INVESTMENT",
        "CREDIT_CARD",
        "PAYLATER",
        "LOAN",
        "PERSONAL_DEBT",
        "OTHER",
      ])
      .nullish(),
    /// Opening-balance MAGNITUDE (≥ 0); the service applies the natural sign
    /// from the type (§3.1, subtype.toNaturalSign).
    openingBalance: z.bigint().min(0n).default(0n),
    openingDate: z.date().nullish(),
    icon: z.string().max(40).nullish(),
    color: z.string().max(40).nullish(),
    group: z.string().max(40).nullish(),
    last4: z
      .string()
      .regex(/^\d{4}$/, "last4 must be exactly 4 digits")
      .nullish(),
    credit: creditParamsSchema.nullish(),
  })
  .superRefine((val, ctx) => {
    if (!isSubtypeCompatible(val.type, val.subtype ?? null)) {
      ctx.addIssue({
        code: "custom",
        path: ["subtype"],
        message: `subtype is not valid for a ${val.type} account (§3.1)`,
      });
    }
    const credit = isCreditSubtype(val.subtype ?? null);
    if (credit && !val.credit) {
      ctx.addIssue({ code: "custom", path: ["credit"], message: "credit/paylater accounts require billing parameters (§3.5)" });
    }
    if (!credit && val.credit) {
      ctx.addIssue({ code: "custom", path: ["credit"], message: "billing parameters are only for CREDIT_CARD/PAYLATER accounts" });
    }
    if (credit && val.credit && val.credit.instrument !== val.subtype) {
      ctx.addIssue({ code: "custom", path: ["credit", "instrument"], message: "instrument must match the account subtype" });
    }
  });

export type CreateAccountInput = z.input<typeof createAccountSchema>;

/// Mutable presentation/labelling fields (§6.1). Type is immutable; balance
/// corrections go through an ADJUSTMENT transaction (§6.1a), not an edit.
export const updateAccountSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  icon: z.string().max(40).nullish(),
  color: z.string().max(40).nullish(),
  group: z.string().max(40).nullish(),
  last4: z.string().regex(/^\d{4}$/).nullish(),
});

export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
