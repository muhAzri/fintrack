-- DB-level guarantees Prisma cannot express in schema.prisma (no schema
-- construct exists for CONSTRAINT TRIGGERs or VIEW bodies). This is the
-- documented Prisma workflow: `migrate dev --create-only` + hand-written SQL.
-- Everything else (tables/enums/indexes/FKs) is Prisma-generated in the
-- 20260708040629_init migration.

-- ===========================================================================
-- 1) Ledger invariant (REQUIREMENTS §2.1, §3.4, §7)
--    Every transaction must have >= 2 postings whose signed amounts sum to 0.
--    Deferred to COMMIT so the header + all legs can be inserted first.
-- ===========================================================================

CREATE OR REPLACE FUNCTION assert_transaction_balanced() RETURNS trigger AS $$
DECLARE
  txn_id  text;
  leg_sum bigint;
  leg_cnt integer;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    txn_id := OLD."transactionId";
  ELSE
    txn_id := NEW."transactionId";
  END IF;

  SELECT COALESCE(SUM(amount), 0), COUNT(*)
    INTO leg_sum, leg_cnt
    FROM postings
   WHERE "transactionId" = txn_id;

  -- Transaction fully removed within this tx: nothing left to balance.
  IF (leg_cnt = 0) THEN
    RETURN NULL;
  END IF;

  IF (leg_cnt < 2) THEN
    RAISE EXCEPTION 'Transaction % has % posting(s); double-entry requires >= 2 (REQUIREMENTS §3.4)', txn_id, leg_cnt;
  END IF;

  IF (leg_sum <> 0) THEN
    RAISE EXCEPTION 'Transaction % postings sum to % but must be 0 (REQUIREMENTS §2.1)', txn_id, leg_sum;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_postings_balanced ON postings;

CREATE CONSTRAINT TRIGGER trg_postings_balanced
  AFTER INSERT OR UPDATE OR DELETE ON postings
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION assert_transaction_balanced();

-- ===========================================================================
-- 2) due_events view (REQUIREMENTS §3.9) — derived, not stored.
--    is_covered_by_cash is computed in the app layer over these rows (§5.6).
-- ===========================================================================

CREATE OR REPLACE VIEW due_events AS
  SELECT
    s."dueDate"                             AS date,
    'STATEMENT_DUE'                         AS type,
    (s."statementBalance" - s."paidAmount") AS amount,
    ca."accountId"                          AS account_id,
    s.id                                    AS source_id
  FROM statements s
  JOIN credit_accounts ca ON ca.id = s."creditAccountId"
  WHERE s.status IN ('CLOSED', 'PARTIALLY_PAID', 'OVERDUE')

  UNION ALL

  SELECT
    isch."dueDate"      AS date,
    'INSTALLMENT_DUE'   AS type,
    isch."totalAmount"  AS amount,
    ca."accountId"      AS account_id,
    isch.id             AS source_id
  FROM installment_schedules isch
  JOIN installment_plans ip ON ip.id = isch."planId"
  JOIN credit_accounts   ca ON ca.id = ip."creditAccountId"
  WHERE isch.status <> 'PAID';
