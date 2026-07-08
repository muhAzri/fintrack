// The Σ=0 double-entry invariant (docs/REQUIREMENTS §2.1, §3.4, P1).
//
// Every transaction has >= 2 postings whose signed amounts sum to exactly 0.
// This is enforced in THREE places, deliberately redundant (§7 integrity):
//   1. here, at the app boundary (Zod + assertBalanced), for fast, typed errors;
//   2. by the Postgres CONSTRAINT TRIGGER trg_postings_balanced at COMMIT;
//   3. implicitly by the balanced journal entries the callers construct.
// This module is pure — no Prisma, no I/O — so it is trivially unit-testable.
import { z } from "zod";

/// One journal leg. `amount` is a signed integer in whole rupiah: debit = +,
/// credit = − (§2.1). Category is set only on expense/income legs (§3.4).
export const postingInputSchema = z.object({
  accountId: z.string().min(1),
  amount: z.bigint(),
  categoryId: z.string().min(1).nullish(),
});

export type PostingInput = z.infer<typeof postingInputSchema>;

/// Structural validity of a set of postings: >= 2 legs summing to 0 (§3.4).
export const balancedPostingsSchema = z
  .array(postingInputSchema)
  .min(2, "double-entry requires >= 2 postings (§3.4)")
  .refine((postings) => sumPostings(postings) === 0n, {
    message: "Σ postings must equal 0 (§2.1)",
  });

export function sumPostings(postings: Iterable<{ amount: bigint }>): bigint {
  let total = 0n;
  for (const p of postings) total += p.amount;
  return total;
}

export function isBalanced(postings: ReadonlyArray<{ amount: bigint }>): boolean {
  return postings.length >= 2 && sumPostings(postings) === 0n;
}

/// Throw unless the postings form a valid double-entry (§2.1, §3.4). Mirrors the
/// DB trigger's two checks so callers fail fast with a clear message.
export function assertBalanced(postings: ReadonlyArray<{ amount: bigint }>): void {
  if (postings.length < 2) {
    throw new Error(
      `double-entry requires >= 2 postings, got ${postings.length} (§3.4)`,
    );
  }
  const total = sumPostings(postings);
  if (total !== 0n) {
    throw new Error(`Σ postings must be 0 but is ${total} (§2.1)`);
  }
}
