// Statement formation (docs/REQUIREMENTS §5.2, §5.4, §3.6, §7, §15.1). Closes a
// billing cycle: gathers the cycle's activity from the ledger, accrues interest
// on the carried balance, bills due installments, computes the statement, and
// stamps every included transaction/installment with the statement id.
//
// IDEMPOTENT (§7): one statement per (creditAccount, periodEnd). Re-running for
// the same cycle returns the existing statement and posts nothing new — the
// stamping (statementId != null) is exactly what keeps a re-run from
// re-gathering the same purchases.
import { cycleForDate, dueDateForStatement, statementDate } from "@/lib/dates";
import { applyRate, money } from "@/lib/money";
import { prisma } from "@/lib/db";
import { computeMinimumDue, computeStatementBalance } from "./statement";
import { bigMax, dueConfigFor, findInterestExpenseAccount, inCycle, loadCreditAccount } from "./shared";

export interface FormStatementResult {
  statement: Awaited<ReturnType<typeof prisma.statement.create>>;
  created: boolean;
}

/// Form (close) the statement whose cut-off is `statementDay` of the given
/// month (§5.2). Safe to call repeatedly.
export async function formStatement(
  userId: string,
  creditAccountId: string,
  close: { year: number; month: number },
  opts: { interestExpenseAccountId?: string } = {},
): Promise<FormStatementResult> {
  return prisma.$transaction(async (tx) => {
    const ca = await loadCreditAccount(tx, userId, creditAccountId);
    const periodEnd = statementDate(close.year, close.month, ca.statementDay);

    // Idempotency: never form the same cycle twice (§7).
    const existing = await tx.statement.findFirst({
      where: { creditAccountId: ca.id, periodEnd },
    });
    if (existing) return { statement: existing, created: false };

    const cycle = cycleForDate(periodEnd, ca.statementDay);
    const dueDate = dueDateForStatement(periodEnd, dueConfigFor(ca));
    const rate = ca.interestRateMonthly.toString();

    // Balance carried from the prior statement (§3.6): unpaid remainder, ≥ 0.
    const prev = await tx.statement.findFirst({
      where: { creditAccountId: ca.id, periodEnd: { lt: periodEnd } },
      orderBy: { periodEnd: "desc" },
    });
    const previousBalance = prev ? bigMax(0n, prev.statementBalance - prev.paidAmount) : 0n;

    // Create the statement first so we have an id to stamp with.
    const statement = await tx.statement.create({
      data: {
        creditAccountId: ca.id,
        periodStart: cycle.periodStart,
        periodEnd,
        dueDate,
        previousBalance,
        status: "CLOSED",
      },
    });

    // --- purchases posted within this cycle (unstamped EXPENSE entries) -------
    const purchaseTxns = await tx.transaction.findMany({
      where: {
        userId,
        statementId: null,
        type: "EXPENSE",
        postings: { some: { accountId: ca.accountId } },
      },
      include: { postings: { where: { accountId: ca.accountId } } },
    });
    let purchasesTotal = 0n;
    const stampIds: string[] = [];
    for (const t of purchaseTxns) {
      if (!inCycle(t.postedDate ?? t.date, cycle)) continue;
      for (const p of t.postings) purchasesTotal += -p.amount; // liability leg is a credit (−)
      stampIds.push(t.id);
    }

    // --- refunds / chargebacks within this cycle reduce the balance (§5.5) ----
    const refundTxns = await tx.transaction.findMany({
      where: {
        userId,
        statementId: null,
        type: "REFUND",
        postings: { some: { accountId: ca.accountId } },
      },
      include: { postings: { where: { accountId: ca.accountId } } },
    });
    let creditsTotal = 0n;
    for (const t of refundTxns) {
      if (!inCycle(t.postedDate ?? t.date, cycle)) continue;
      for (const p of t.postings) creditsTotal += p.amount; // refund debits the liability (+)
      stampIds.push(t.id);
    }

    // --- installments falling due this cycle (§5.3) --------------------------
    // An installment is generated with dueDate = this statement's due date
    // (§15.2: billed at the Jul 25 close, payable Jul 30), so it bills into the
    // cycle whose statement due date matches — not one bounded by the cut-off.
    const schedules = await tx.installmentSchedule.findMany({
      where: {
        status: "SCHEDULED",
        plan: { creditAccountId: ca.id },
        dueDate,
      },
    });
    let installmentsDue = 0n;
    let installmentInterest = 0n;
    for (const s of schedules) {
      installmentsDue += s.totalAmount; // principal + interest for this installment
      installmentInterest += s.interestComponent;
    }

    // --- interest (§5.4) -----------------------------------------------------
    // Carried-balance interest counts in the interest bucket; installment
    // interest is already inside installmentsDue. Both must actually increase
    // the liability, so post the combined amount; keep the buckets separate so
    // the statement total doesn't double count.
    const carryInterest = previousBalance > 0n ? applyRate(money(previousBalance), rate) : 0n;
    const interestPostingTotal = carryInterest + installmentInterest;
    if (interestPostingTotal > 0n) {
      const interestAccountId = await findInterestExpenseAccount(tx, userId, opts.interestExpenseAccountId);
      await tx.transaction.create({
        data: {
          userId,
          date: periodEnd,
          description: "Card interest & fees",
          type: "EXPENSE",
          statementId: statement.id, // stamped now → never re-gathered as a purchase
          postings: {
            create: [
              { accountId: interestAccountId, amount: interestPostingTotal },
              { accountId: ca.accountId, amount: -interestPostingTotal },
            ],
          },
        },
      });
    }

    // Stamp everything this statement absorbed.
    if (stampIds.length > 0) {
      await tx.transaction.updateMany({ where: { id: { in: stampIds } }, data: { statementId: statement.id } });
    }
    if (schedules.length > 0) {
      await tx.installmentSchedule.updateMany({
        where: { id: { in: schedules.map((s) => s.id) } },
        data: { status: "BILLED", statementId: statement.id },
      });
    }

    // --- totals (§3.6) -------------------------------------------------------
    const statementBalance = computeStatementBalance({
      previousBalance: money(previousBalance),
      purchasesTotal: money(purchasesTotal),
      installmentsDue: money(installmentsDue),
      interestCharged: money(carryInterest),
      creditsTotal: money(creditsTotal),
    });
    const minimumDue = computeMinimumDue(statementBalance, {
      rate: ca.minPaymentRate?.toString() ?? null,
      floor: ca.minPaymentFloor != null ? money(ca.minPaymentFloor) : null,
    });

    const updated = await tx.statement.update({
      where: { id: statement.id },
      data: {
        purchasesTotal,
        installmentsDue,
        interestCharged: carryInterest,
        creditsTotal,
        statementBalance,
        minimumDue,
      },
    });

    return { statement: updated, created: true };
  });
}
