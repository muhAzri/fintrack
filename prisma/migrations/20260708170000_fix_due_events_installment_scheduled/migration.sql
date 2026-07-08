-- Fix due_events double-counting (REQUIREMENTS §3.9, §5.6).
--
-- An installment that has been BILLED into a statement is already reflected in
-- that statement's STATEMENT_DUE (statementBalance − paidAmount). The original
-- view listed INSTALLMENT_DUE for every installment where status <> 'PAID',
-- which included BILLED ones and therefore double-counted them in the due
-- timeline. INSTALLMENT_DUE must list only SCHEDULED (not-yet-billed)
-- installments — the future obligations not yet in any statement.

-- DROP + CREATE (not CREATE OR REPLACE): Postgres refuses to REPLACE a view
-- whose column set it considers changed. Nothing depends on this view.
DROP VIEW IF EXISTS due_events;

CREATE VIEW due_events AS
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
  WHERE isch.status = 'SCHEDULED';
