# Requirements Document — Personal Finance Application ("Digital Accountant")

> **Status:** Draft v1.3 · **Date:** 2026-07-08 · **Base currency:** IDR (Indonesian Rupiah)
> This document is the **single source of truth** for scope, data model, and business rules. Every implementation decision must trace back here. If something changes, change this document **first**, then the code.

---

## Table of Contents

0. [Product Summary & Philosophy](#0-product-summary--philosophy)
1. [Scope](#1-scope)
2. [Core Concept: Double-Entry Accounting](#2-core-concept-double-entry-accounting)
3. [Data Model (Logical Schema)](#3-data-model-logical-schema)
4. [Initial Chart of Accounts (Seed)](#4-initial-chart-of-accounts-seed)
5. [Business Rules: Billing Cycles, Installments, Payments (MVP CORE)](#5-business-rules-billing-cycles-installments-payments-mvp-core)
6. [Functional Requirements — MVP (User Stories & Acceptance)](#6-functional-requirements--mvp-user-stories--acceptance)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Money Handling Specification](#8-money-handling-specification)
9. [Technical Stack Recommendation](#9-technical-stack-recommendation)
10. [Suggested Project Structure](#10-suggested-project-structure)
11. [Testing Strategy](#11-testing-strategy)
12. [Phased Roadmap](#12-phased-roadmap)
13. [Open Questions / Decisions to Confirm](#13-open-questions--decisions-to-confirm)
14. [Glossary](#14-glossary)
15. [Worked Examples (End-to-End Scenarios)](#15-worked-examples-end-to-end-scenarios)

---

## 0. Product Summary & Philosophy

A personal finance application that behaves like a **personal accountant**, not just an expense-logging app. Its foundation is genuine **double-entry bookkeeping**, so that:

- Net worth is computed accurately at any point in time (`Assets − Liabilities`).
- Credit card & paylater transactions ("pay in the future") are recorded correctly — the liability increases when you spend, and cash decreases only when you pay the bill.
- Transfers between accounts are never miscounted as expenses.

**Primary motivation (why this project exists):** the owner transacts very actively using **paylater and credit cards**. Because of that, **billing-cycle support is mandatory from the MVP** — it is not a later phase.

### Non-negotiable Design Principles

| # | Principle | Rationale |
|---|-----------|-----------|
| P1 | **Double-entry from the very first line of code** | Single-entry breaks credit cards & transfers. This is the #1 reason similar apps fail. |
| P2 | **Money = integer (smallest currency unit), NEVER floating point** | Floats introduce rounding errors on money. |
| P3 | **Transactions are append-only** | Corrections are made via reversing entries, never destructive edits. Clean audit trail. |
| P4 | **Tax tables are versioned per tax year** | Indonesian income-tax rules (rates/PTKP) change yearly. Never hardcode. |
| P5 | **Transaction date ≠ posted date** for credit instruments | The billing cycle is determined by posted date; a 1–3 day gap around the statement date decides which cycle a purchase lands in. |
| P6 | **The ledger is the truth; everything else is a projection** | Balances, net worth, statements, and reports are all *derived* from postings. Never store a "current balance" as an editable field. |

---

## 1. Scope

### 1.1 MVP (built now)

1. **Double-entry ledger** — accounts (asset/liability/income/expense/equity), balanced transactions, hierarchical categories.
2. **Multi-account "money storage" management** — unlimited asset accounts across many banks, e-wallets/e-money, and cash, each with its own balance; transfers between them; an aggregate "where is my money" view. See §6.1a.
3. **Credit cards & paylater as first-class citizens** — billing cycles, statements, installment plans, bill payments.
4. **Due-date calendar + reminders** — a timeline of what is due in the next 7/14/30 days and whether liquid cash covers it.
5. **Basic dashboard** — net worth, total outstanding liabilities (broken down per instrument), monthly cash flow.
6. **Authentication & multi-user** — email + password login, DB-backed revocable sessions, and a forgot-password flow via emailed reset link (SMTP). All financial data is **scoped per user** (multi-tenant). See §6.0. This is mandatory before hosting: without it, anyone with the URL could read and corrupt another person's financial data.

### 1.2 Out of MVP (later phases — DO NOT build yet)

- Budgeting / envelope system
- CSV / bank e-statement import & receipt OCR
- Automatic investment valuation via price APIs
- **Indonesian income-tax module (PPh) & tax-return (SPT) generator** (most complex — final phase)
- Advanced multi-currency, household mode, mobile/PWA offline-sync

> Out-of-MVP features **may** influence schema design (to avoid a large migration later), but are **not implemented** in the MVP iteration. Fields reserved for later phases are marked _"reserved"_ in the schema.

---

## 2. Core Concept: Double-Entry Accounting

### 2.1 Fundamental Rule

Every **transaction** consists of ≥2 **postings** (journal legs). The sum of all postings within one transaction **is always exactly 0** (expressed in the base currency, IDR).

**Sign convention used throughout this document:** a single **signed** `amount` column. Debit = positive (`+`), credit = negative (`−`). What is binding is the *normal balance direction per account type* below; the invariant is that all postings in a transaction sum to 0.

| Account type | Balance **increases** on | Normal balance | Examples |
|--------------|--------------------------|----------------|----------|
| `ASSET` | debit (+) | debit | cash, bank, e-wallet, investments, receivables |
| `LIABILITY` | credit (−) | credit | credit card, paylater, mortgage, personal loans |
| `INCOME` | credit (−) | credit | salary, bonus, interest, dividends, capital gains |
| `EXPENSE` | debit (+) | debit | food, transport, subscriptions, card interest & fees |
| `EQUITY` | credit (−) | credit | opening balances |

**Account balance** (signed, in "natural ledger sign") = `opening_balance + Σ postings.amount` up to a date.
For display, ASSET/EXPENSE balances are shown as their positive debit value; LIABILITY/INCOME/EQUITY balances are shown as the absolute value of their (negative) credit sum. See §8 for the exact convention.

### 2.2 Canonical Journal Entries (MUST be understood before coding)

**(a) Spend Rp50,000 with cash**
```
Dr  Expense:Food            +50,000
Cr  Asset:Cash              −50,000
```

**(b) Spend Rp50,000 with a CREDIT CARD** (liability rises, cash untouched)
```
Dr  Expense:Food                    +50,000
Cr  Liability:CreditCard BCA        −50,000
```

**(c) Pay a Rp2,000,000 credit-card bill from a bank account** (this is a TRANSFER, NOT an expense)
```
Dr  Liability:CreditCard BCA        +2,000,000   (debt decreases)
Cr  Asset:Bank                      −2,000,000
```

**(d) Transfer between accounts** (not an expense)
```
Dr  Asset:Bank Jago         +1,000,000
Cr  Asset:Cash              −1,000,000
```

**(e) Receive salary Rp10,000,000**
```
Dr  Asset:Bank              +10,000,000
Cr  Income:Salary           −10,000,000
```

**(e2) Transfer / e-wallet top-up WITH an optional admin fee** (3-leg entry) — top up GoPay Rp500,000 from BCA with a Rp1,000 admin fee:
```
Dr  Asset:GoPay                       +500,000
Dr  Expense:Admin & Transfer Fees       +1,000
Cr  Asset:Bank BCA                     −501,000
```
The fee is a **real expense** (money truly leaves your net worth), whereas the moved Rp500,000 is not. The fee is **optional**: when it is 0, this collapses to the plain 2-leg transfer (§2.2d).

**(f) Buy Rp1,500,000 on paylater, split into 3 installments** — see §5.3 for full details.

**(g) Interest charged on a revolving credit-card balance (Rp35,000)**
```
Dr  Expense:Card Interest & Fees    +35,000
Cr  Liability:CreditCard BCA        −35,000
```

**(h) Refund of a Rp50,000 card purchase**
```
Dr  Liability:CreditCard BCA        +50,000
Cr  Expense:Food                    −50,000
```

### 2.3 Derived Computations

- **Net worth** at date `T` = `Σ ASSET balances − Σ LIABILITY balances` as of `T`.
- **Monthly cash flow** for period `X` = `Σ INCOME − Σ EXPENSE` recognized within `X` (accrual basis: an expense is recognized at the transaction date, **not** when the card bill is paid).
- **Account balance** at `T` = `opening_balance + Σ postings.amount` where `posting.date ≤ T`.

---

## 3. Data Model (Logical Schema)

> Notation: `PK` = primary key, `FK` = foreign key, `?` = nullable. All monetary amounts are `BIGINT` integers in whole rupiah (1 = Rp1). All timestamps are stored in UTC. Every entity implicitly has `id`, `created_at`, `updated_at` unless stated otherwise.
>
> **Multi-tenancy (§13.2, resolved):** the app is multi-user. The four aggregate roots — `accounts`, `categories`, `transactions`, `recurring_rules` — each carry a `user_id` FK → `users` and are scoped per user. Child tables (`postings`, `credit_accounts`, `statements`, `installment_plans`, `installment_schedules`) do **not** duplicate `user_id`; they inherit tenancy through their parent. The application layer **must** guarantee that every leg/relation of a single write belongs to the same user (e.g. a posting's `account` and its `transaction` share one `user_id`, and a payment's source & target accounts are both owned by the acting user).

### 3.1 `accounts`

| Column | Type | Notes |
|--------|------|-------|
| id | PK | |
| name | text | "BCA Blibli Card", "SPayLater", "Wallet Cash" |
| type | enum | `ASSET` \| `LIABILITY` \| `INCOME` \| `EXPENSE` \| `EQUITY` |
| subtype | enum? | ASSET: `CASH`,`BANK`,`EWALLET`,`RECEIVABLE`,`INVESTMENT`,`OTHER` · LIABILITY: `CREDIT_CARD`,`PAYLATER`,`LOAN`,`PERSONAL_DEBT`,`OTHER` |
| currency | char(3) | default `IDR` |
| opening_balance | bigint | default 0 (natural ledger sign) |
| opening_date | date? | |
| is_archived | bool | soft-hide; balance still computed |
| last4 | char(4)? | last 4 digits only for cards — NEVER store full PAN |
| icon | text? | UI |
| color | text? | UI |

Constraint: `subtype` must be compatible with `type`. A `CREDIT_CARD`/`PAYLATER` account has exactly one `credit_accounts` row (§3.5).

### 3.2 `categories` (for EXPENSE & INCOME classification)

| Column | Type | Notes |
|--------|------|-------|
| id | PK | |
| name | text | "Coffee" |
| parent_id | FK? | hierarchical (Food → Dining Out → Coffee) |
| kind | enum | `EXPENSE` \| `INCOME` |
| tax_relevant | bool | _reserved_ flag for the tax phase (dividends, rent, capital gains). Not used in MVP. |

### 3.3 `transactions` (journal header)

| Column | Type | Notes |
|--------|------|-------|
| id | PK | |
| date | date | **transaction date** (the economic event) |
| posted_date | date? | **posted date** for credit instruments; falls back to `date` when null |
| description | text | |
| merchant | text? | |
| type | enum | `EXPENSE`,`INCOME`,`TRANSFER`,`CC_PAYMENT`,`ADJUSTMENT`,`INSTALLMENT_PURCHASE`,`REFUND` — a **UX/reporting hint only**; truth always lives in the postings |
| reversal_of | FK? | set when this transaction reverses another (P3) |
| installment_plan_id | FK? | → `installment_plans` |
| statement_id | FK? | the billing cycle this transaction falls into (assigned when the statement is formed) |
| attachment_url | text? | receipt (attachment phase) |
| note | text? | free text |

### 3.4 `postings` (journal legs)

| Column | Type | Notes |
|--------|------|-------|
| id | PK | |
| transaction_id | FK | → transactions |
| account_id | FK | → accounts |
| amount | bigint | **signed**: debit `+` / credit `−` (§2.1) |
| category_id | FK? | for expense/income legs |

**Critical invariant:** `Σ postings.amount WHERE transaction_id = X` **= 0**. Enforced in the application layer **and** at the database layer (deferred constraint / trigger). A transaction with fewer than 2 postings, or a non-zero sum, must be impossible to persist.

### 3.5 `credit_accounts` (billing parameters for credit cards & paylater)

One row per credit-card / paylater account. This is the single model that serves **both** instruments — they differ only by parameters.

| Column | Type | Notes |
|--------|------|-------|
| id | PK | |
| account_id | FK | → accounts (subtype `CREDIT_CARD` or `PAYLATER`) |
| instrument | enum | `CREDIT_CARD` \| `PAYLATER` |
| credit_limit | bigint? | credit limit |
| statement_day | int | day of month the statement closes (1–31; see §5.5 for month-end clamping) |
| due_day | int? | day of month payment is due (1–31) |
| due_offset_days | int? | alternative to `due_day`: due = statement_date + N days (paylater often uses this). Exactly one of `due_day` / `due_offset_days` is set. |
| grace_period_days | int? | informational |
| interest_rate_monthly | numeric | e.g. `0.0175` (1.75%/month). Stored as ratio; **all computation is integer** (see §8). |
| min_payment_rate | numeric? | e.g. `0.05` (5%) |
| min_payment_floor | bigint? | e.g. Rp50,000 |
| late_fee | bigint? | flat late fee |
| autopay_source_account_id | FK? | _reserved_ — optional default cash/bank source for payments |

### 3.6 `statements` (one billing cycle, formed or forming)

| Column | Type | Notes |
|--------|------|-------|
| id | PK | |
| credit_account_id | FK | |
| period_start | date | first day of the cycle |
| period_end | date | = statement date (closing/cut-off date) |
| due_date | date | payment due date |
| previous_balance | bigint | unpaid balance carried from the prior statement |
| purchases_total | bigint | purchases posted within this cycle |
| installments_due | bigint | installment portion falling due in this cycle |
| interest_charged | bigint | interest charged this cycle |
| fees_charged | bigint | fees / late charges this cycle |
| credits_total | bigint | refunds / reversals within this cycle (reduces balance) |
| statement_balance | bigint | `previous_balance + purchases_total + installments_due + interest_charged + fees_charged − credits_total − payments_applied_before_close` |
| minimum_due | bigint | minimum payment |
| paid_amount | bigint | payments allocated to this statement |
| status | enum | `OPEN` (cycle in progress) \| `CLOSED` (cut, awaiting payment) \| `PARTIALLY_PAID` \| `PAID` \| `OVERDUE` |

Uniqueness: one statement per (`credit_account_id`, `period_end`).

### 3.7 `installment_plans` & `installment_schedules`

**`installment_plans`**

| Column | Type | Notes |
|--------|------|-------|
| id | PK | |
| credit_account_id | FK | the card/paylater that carries the installments |
| purchase_transaction_id | FK | the original purchase transaction |
| principal | bigint | total principal |
| tenor_months | int | number of installments |
| interest_rate_monthly | numeric | 0 for 0% installments |
| admin_fee | bigint? | one-time admin fee, if any |
| monthly_amount | bigint | scheduled amount per month (principal + interest) |
| start_date | date | |
| status | enum | `ACTIVE` \| `COMPLETED` \| `CANCELLED` |

**`installment_schedules`** (one row per due installment)

| Column | Type | Notes |
|--------|------|-------|
| id | PK | |
| plan_id | FK | |
| sequence | int | 1..tenor |
| due_date | date | |
| principal_component | bigint | |
| interest_component | bigint | |
| total_amount | bigint | principal + interest for this installment |
| statement_id | FK? | the cycle this installment is billed into |
| status | enum | `SCHEDULED` \| `BILLED` \| `PAID` |

### 3.8 `recurring_rules` (reserved; minimal in MVP)

Rules for recurring transactions (salary, subscriptions, fixed installments) that generate draft transactions. MVP may limit this to storing a template + reminder; auto-posting is optional.

| Column | Type | Notes |
|--------|------|-------|
| id | PK | |
| name | text | |
| template_json | jsonb | serialized transaction template (accounts, amounts, category) |
| frequency | enum | `MONTHLY`,`WEEKLY`,`YEARLY`,`CUSTOM` |
| next_run | date | |
| auto_post | bool | if false, generate a draft to confirm |

### 3.9 `due_events` (calendar & reminders)

Preferably a **derived view** over `statements`, `installment_schedules`, and `recurring_rules` rather than a stored table (keeps a single source of truth). Minimum fields exposed:

| Field | Notes |
|-------|-------|
| date | due date |
| type | `STATEMENT_DUE` \| `INSTALLMENT_DUE` \| `RECURRING` |
| amount | bigint |
| account_id | which instrument |
| is_covered_by_cash | computed: does liquid cash cover cumulative dues up to this date? |

> The view exposes each row's owning `user_id` (via `account → user_id`) so the calendar can filter per user; `is_covered_by_cash` is computed in the app/query layer over the user's own liquid balance (§5.6), not stored.

### 3.10 `users` (authentication & tenancy)

One row per account owner. Login is by **email + password**; `username` is optional.

| Column | Type | Notes |
|--------|------|-------|
| id | PK | |
| email | text | **unique**; login identifier & reset-link target |
| username | text? | **unique** when present; optional alternative handle |
| name | text? | display name |
| password_hash | text | **argon2id / bcrypt** hash — NEVER plaintext (§7) |
| email_verified_at | timestamp? | set when the user confirms their email (SMTP); null = unverified |
| deactivated_at | timestamp? | soft-disable instead of hard delete, to preserve the append-only ledger (P3) |

### 3.11 `sessions` (DB-backed, revocable)

The client cookie holds a random **opaque** token; the DB stores only its **hash**, so a DB leak cannot resurrect a live session. Sessions are revocable (logout, "sign out everywhere").

| Column | Type | Notes |
|--------|------|-------|
| id | PK | |
| user_id | FK | → `users` (cascade on user delete) |
| token_hash | text | **unique**; SHA-256 of the cookie token — never the raw token |
| expires_at | timestamp | absolute session expiry |
| last_used_at | timestamp? | sliding activity (optional) |
| user_agent | text? | audit / device list |
| ip | text? | audit |

### 3.12 `password_reset_tokens` (forgot-password via SMTP)

A reset request emails a one-time link. The token is stored **hashed**, is **single-use** (`used_at`), and **short-lived** (`expires_at`). The flow must not reveal whether an email exists (no user enumeration — §7).

| Column | Type | Notes |
|--------|------|-------|
| id | PK | |
| user_id | FK | → `users` (cascade on user delete) |
| token_hash | text | **unique**; SHA-256 of the emailed token |
| expires_at | timestamp | short TTL (e.g. 30–60 min) |
| used_at | timestamp? | set the moment it is consumed; a used/expired token is rejected |

> **Note on the aggregate roots:** `accounts` (§3.1), `categories` (§3.2), `transactions` (§3.3), and `recurring_rules` (§3.8) each gain a `user_id` FK → `users`. A user cannot be **hard-deleted** while they own ledger data (FK `RESTRICT`); deactivate via `deactivated_at` instead (P3, auditability §7). The `transaction.user_id` doubles as the audit **actor** (§7).

---

## 4. Initial Chart of Accounts (Seed)

The default account tree created during onboarding (fully editable by the user):

- **ASSET** — Wallet Cash; Banks (BCA / Mandiri / Jago / …); E-Wallets (GoPay / OVO / Dana / ShopeePay); Receivables (money lent to others)
- **LIABILITY** — Credit Cards (one account per card); Paylater (SPayLater / GoPayLater / Kredivo / …); Mortgage (KPR); Personal Loan (KTA); Personal Debt (money borrowed from people)
- **INCOME** — Salary; Bonus/THR; Freelance; Interest; Dividends; Capital Gains
- **EXPENSE** — Food (→ Dining Out → Coffee); Transport; Shopping; Bills/Utilities; Entertainment; Health; **Card Interest & Fees**; **Admin & Transfer Fees** (e-wallet top-up charges, bank transfer/admin fees); Miscellaneous
- **EQUITY** — Opening Balance

---

## 5. Business Rules: Billing Cycles, Installments, Payments (MVP CORE)

This is the heart of the application. Get this wrong and the app does not solve the owner's actual problem.

### 5.1 Modeling Principle

Credit cards **and** paylater use the **same model** (`credit_accounts` + `statements`), differing only by parameters. There are **not** two separate systems.

### 5.2 Determining Which Cycle a Transaction Belongs To

1. Take the transaction's `posted_date` (fall back to `date` if null).
2. Determine the credit account's current cycle: from *(previous month's `statement_day` + 1 day)* through *(this month's `statement_day`)*.
3. A transaction whose `posted_date` is **≤ statement_day** belongs to **this** cycle; **> statement_day** belongs to the **next** cycle.
4. When a cycle closes (the statement date passes), create/finalize the `statements` record and stamp `statement_id` onto every transaction and installment falling into that cycle.

### 5.3 Installments

Example: a Rp1,500,000 purchase split into 3 installments (0%).

- **Decision (MVP):** at the moment of an installment purchase, recognize the **full** liability immediately in the liability account; then each installment that comes due lands in `statement.installments_due`. `installment_schedules` produces 3 rows of Rp500,000, each with a `due_date` in its respective cycle.
- Purchase journal entry:
```
Dr  Expense:Shopping             +1,500,000
Cr  Liability:SPayLater          −1,500,000
```
- Installments do **not** re-journal the purchase. They only affect the **composition of the statement** and — if the plan is interest-bearing — add an `Expense:Card Interest & Fees` posting for the interest component each month:
```
Dr  Expense:Card Interest & Fees   +interest_component
Cr  Liability:SPayLater             −interest_component
```
- For interest-bearing plans, `monthly_amount = round(principal / tenor) + interest_component`; keep `principal_component` and `interest_component` separate. Reconcile rounding on the final installment (see §8.3).

### 5.4 Bill Payments

- A payment is a `CC_PAYMENT` transaction = a transfer from an ASSET (cash/bank) to a LIABILITY (the card). **It is not an expense.**
- Allocation order of a payment against a statement: **interest & fees → oldest balance → most recent balance.** MVP may simplify to: reduce `statement.paid_amount`, then recompute status.
- Supported payment modes: **pay in full**, **pay partial**, **pay minimum**.
- If only partial/minimum is paid, the remaining balance accrues **interest** in the next cycle:
  `interest = round(interest_bearing_balance × interest_rate_monthly)` (integer), journaled as in §5.3.
- Payment journal entry:
```
Dr  Liability:CreditCard BCA     +amount
Cr  Asset:Bank                   −amount
```

### 5.5 Edge Cases That MUST Be Handled

| Case | Required behavior |
|------|-------------------|
| `statement_day` / `due_day` = 29/30/31 in a shorter month | Clamp to the last day of that month (e.g. Feb 31 → Feb 28/29). |
| Due date falls in the calendar month *after* the statement date | Use `due_offset_days` or explicit "month + 1" logic. |
| Refund / chargeback after the statement is formed | Post an opposite entry; reduce the current cycle via `credits_total`. |
| Overpayment | Liability balance goes positive (a credit on the card) — this is valid. |
| Transaction exactly on the statement day | Belongs to the current cycle (§5.2 rule "≤"). |
| Installment purchase near the cut-off | The purchase's cycle follows §5.2; the *schedule* due dates follow the plan `start_date`. |
| Cancelling an installment plan | Set plan `CANCELLED`, reverse remaining `SCHEDULED` rows; already-billed rows stay. |

### 5.6 Daily Views the App Must Provide (derived from the rules above)

- **Total outstanding liabilities** = `Σ balances of all LIABILITY accounts with subtype CREDIT_CARD/PAYLATER`, broken down per instrument.
- **"Locked bill this month"** (statements in `CLOSED`/`PARTIALLY_PAID`/`OVERDUE`, not yet `PAID`) vs **"running spend for next cycle"** (postings in the `OPEN` cycle).
- **Due timeline for 7/14/30 days** + an indicator of whether total liquid ASSET (`CASH + BANK + EWALLET`) covers total upcoming dues.

---

## 6. Functional Requirements — MVP (User Stories & Acceptance)

### 6.0 Authentication & Account Ownership

- As a new user, I can **register** with email + password (username optional). The password is stored only as an **argon2id/bcrypt hash**.
- As a user, I can **log in** and receive a **DB-backed session** (httpOnly, Secure, SameSite cookie holding an opaque token whose hash is stored in `sessions`).
- As a user, I can **log out** (revoke the current session) and **sign out everywhere** (revoke all my sessions).
- As a user who forgot my password, I can **request a reset link**; the app emails a one-time link via **SMTP**. Clicking it lets me set a new password. The token is single-use and expires quickly.
- **Every page and every ledger mutation is behind auth.** An unauthenticated request can neither read nor write any financial data.
- **Tenant isolation:** every query is scoped to the authenticated `user_id`; a user can never read or mutate another user's accounts, transactions, statements, or plans — including indirectly (e.g. posting to someone else's account, or paying someone else's card).
- **Security rules (see §7):** passwords hashed (never plaintext/reversible); session & reset tokens stored hashed; reset flow must not reveal whether an email exists (no user enumeration); rate-limit login and reset requests.
- **Acceptance:**
  - A request with no/invalid session to any `/accounts`, `/transactions`, `/calendar`, `/dashboard` route or server action is rejected (redirect to login / 401) and touches no data.
  - Two users each with their own accounts see **only** their own balances and net worth; user A cannot fetch, transfer to, or pay user B's accounts even by guessing IDs.
  - A password-reset link works exactly once; a second use, or use after expiry, is rejected. Requesting a reset for an unknown email returns the **same** response as for a known one.

### 6.1 Accounts

- As a user, I can **create / edit / archive** accounts (assets & liabilities) with subtype & opening balance.
- For credit cards / paylater, I can set **billing parameters** (§3.5).
- **Acceptance:** creating a card with `statement_day=1`, `due_day=25` produces correct cycle boundaries and due dates for the next 3 months, including month-end clamping.

### 6.1a Multi-Account "Money Storage" Management

> **Why this exists:** the owner keeps money spread across **many places** — several bank accounts (BCA, Mandiri, Jago, …), multiple e-wallets / e-money (GoPay, OVO, Dana, ShopeePay, …), and physical cash. The app must treat "where the money lives" as a core, explicit feature — not merely an implicit consequence of the account model.

- As a user, I can create **an unlimited number of asset accounts**, each with a `subtype` (`CASH`, `BANK`, `EWALLET`, `INVESTMENT`, `RECEIVABLE`), a name, an icon/color, and an opening balance.
- Each account shows its **own independent, always-derived balance** (never a stored editable field — P6).
- I can **transfer between any two accounts** as a single balanced transaction (`Dr destination / Cr source`), which must **not** appear as income or expense (§2.2d). Transfers to/from a liability account are the bill-payment flow (§5.4).
- **Optional transfer/top-up fee:** a transfer may carry an **optional admin fee** (e.g. an e-wallet top-up charge). When present, it becomes a third posting to an expense account (`Expense:Admin & Transfer Fees`), making a balanced 3-leg entry (§2.2e2). The fee is the only part that reduces net worth; the transferred amount does not. When the fee is 0 or omitted, the transaction stays a plain 2-leg transfer. The fee amount and its expense category default sensibly but are editable.
- I can **group / filter** accounts by subtype and by an optional custom "group" label (e.g. "Daily", "Savings", "Emergency").
- I can **archive** an account I no longer use; its historical postings still count toward past balances and net worth, but it is hidden from active pickers.
- **Aggregate "Where is my money" view:** a single screen listing every asset account with its balance, subtotals per subtype (total cash, total in banks, total in e-wallets), and a **Total Liquid** figure (`CASH + BANK + EWALLET`) that feeds the due-date cash-coverage indicator (§5.6, §6.4).
- **Per-account statement/history:** selecting an account shows only the postings that touched it, with a running balance — the equivalent of a bank passbook / mutasi.
- **Balance reconciliation:** I can record an `ADJUSTMENT` transaction to align an account to its real-world balance (e.g. bank shows Rp1,203,400 but the ledger says Rp1,200,000), journaled against an `Equity:Opening Balance`/adjustment account so the books stay balanced (P1) and the correction is auditable (P3).
- **Acceptance:** with 3 banks + 2 e-wallets + cash, the aggregate view's **Total Liquid** equals the sum of those six derived balances; a transfer of Rp1,000,000 from Bank Jago to Cash changes both balances and leaves net worth, total income, and total expense unchanged.

### 6.2 Transactions

- I can record **expense, income, transfer, bill payment, and installment purchase**.
- Every transaction is persisted as a balanced double-entry (`Σ = 0`); persisting an unbalanced entry is rejected.
- I can **reverse** a transaction (append-only), never hard-delete.
- **Split transactions** (one purchase → multiple categories) — allowed near the end of MVP.
- **Acceptance:** a card purchase increases the liability and does not reduce cash; paying the bill reduces both liability and cash; net worth stays consistent across the whole flow.

### 6.3 Billing & Installments (§5)

- Statements form automatically on the statement date; installments generate a schedule; payments change statement status.
- **Acceptance:** a 3-month scenario (purchase → statement cut → partial payment → interest → next statement) yields numbers that match a hand calculation exactly (see §15).

### 6.4 Calendar & Reminders

- A calendar page shows `due_events` with a cash-coverage indicator.
- Reminders at H-7 / H-3 / H-1 (in-app first; push notifications later).
- **Acceptance:** an upcoming statement due in 5 days appears on the calendar with the correct amount and coverage flag.

### 6.5 Dashboard

- Summary tiles: **Net Worth**, **Total Outstanding Debt (per instrument)**, **This Month's Cash Flow**.
- Charts: net-worth trend (computed on the fly in MVP), asset-vs-liability composition.
- **Acceptance:** net worth on the dashboard equals `Σ assets − Σ liabilities` computed directly from postings.

---

## 7. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Money** | `BIGINT` integer, unit = whole rupiah (1 = Rp1). A dedicated `Money` helper. Floating-point `number` for monetary values is forbidden (see §8). |
| **Interest precision** | Compute in integers; explicit, consistent rounding (round-half-up); track rounding remainders where needed (§8.3). |
| **Time** | Store UTC; display in `Asia/Jakarta`. Billing-cycle logic uses local calendar dates. |
| **Integrity** | `Σ postings = 0` enforced at both app and DB layers. Transactions & postings are append-only. |
| **Security** | This is the user's most sensitive data. Encrypt at rest; PIN/biometric on the client (mobile phase); never store full card numbers (max last 4 digits). |
| **Authentication** | Email + password. Passwords hashed with **argon2id** (or bcrypt, cost ≥ 12) — never plaintext or reversible encryption. Sessions are **DB-backed & revocable**; the cookie is httpOnly + Secure + SameSite and carries an opaque token whose **hash** (not the raw token) is stored. Reset tokens are **hashed, single-use, short-TTL**. **No user enumeration** — register/login/reset responses must not reveal whether an email exists. **Rate-limit** login and password-reset endpoints. All routes and server actions are auth-gated; all queries are scoped to the authenticated `user_id` (tenant isolation, §6.0). |
| **Email / SMTP** | Transactional email (password-reset link, later email verification) sent via **SMTP**. SMTP credentials via env/secret, never committed. |
| **Auditability** | Every mutation carries a trail (`created_at`, `reversal_of`, actor = `transaction.user_id`). |
| **Backup / Export** | Full user-owned export (later phase) — schema must be export-friendly. |
| **Performance** | Balances & net worth must compute quickly; consider monthly balance snapshots if data grows large. |
| **Reliability** | Statement generation and installment posting must be **idempotent** — re-running for the same period must not double-post. |

---

## 8. Money Handling Specification

### 8.1 Representation

- All amounts are `BIGINT`, unit = **1 rupiah** (Indonesia has no commonly used sub-rupiah unit in consumer finance). `50000` means Rp50,000.
- In TypeScript, use `bigint` (or a branded `Money` type wrapping `bigint`). Never `number` for money.

### 8.2 Arithmetic

- Addition/subtraction are exact on integers.
- Multiplication by a rate (interest, min-payment) yields a fraction → apply an explicit rounding step immediately (§8.3). Rates may be stored as `numeric`/decimal but the **result** is always rounded to an integer rupiah.

### 8.3 Rounding & Remainder Reconciliation

- Default rounding: **round half up** to the nearest whole rupiah.
- When splitting a total across N installments, distribute the rounding remainder so the components sum **exactly** to the total (e.g. put the leftover on the final installment). Never let `Σ components ≠ total`.
- Interest is computed on the defined interest-bearing base, rounded once, then journaled.

### 8.4 Display

- Format for `Asia/Jakarta` locale: `Rp1.500.000` (thousand separator `.`).
- Signed presentation follows §2.1: assets/expenses shown as positive; liabilities/income shown as their absolute credit value with context (e.g. "Outstanding: Rp2,000,000").

---

## 9. Technical Stack Recommendation

> Project folder is `Next` → **Next.js (App Router) + TypeScript + Tailwind** (scaffolded by the user).

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | **Next.js (latest, App Router)** | Server Components + Server Actions for ledger mutations. |
| Language | TypeScript (`strict`) | |
| Styling | Tailwind CSS | |
| Database | **PostgreSQL** | Strong constraints & transactions for the ledger invariant. |
| ORM | **Prisma** or **Drizzle** | Drizzle is closer to SQL (good for triggers/constraints); Prisma is faster to iterate. **Pick one up front and commit.** |
| Money | Custom `Money` (`bigint`) | Avoid float-based libraries. |
| Validation | **Zod** | Validates transaction input + the `Σ = 0` invariant before persistence. |
| Dates | **date-fns** (or Temporal when stable) | Billing-cycle date math, month-end clamping. |
| Auth | **Custom email+password + DB sessions** | Hand-rolled to fit the exact flow (email/password + SMTP reset) and keep tenancy explicit. Sessions in Postgres (`sessions`), opaque token in an httpOnly cookie. Auth.js/NextAuth is acceptable but its Credentials + reset flow is more plumbing than a small custom layer here. |
| Password hashing | **argon2** (`@node-rs/argon2` / `argon2`) | Or bcrypt (cost ≥ 12). Never store plaintext. |
| Email / SMTP | **nodemailer** | Password-reset links (and later verification). SMTP creds via env/secret. |

> **Prisma 7 note:** the DB connection URL lives in `prisma.config.ts` (`datasource.url`), **not** in `schema.prisma` (which only declares `provider`). Prisma 7 no longer auto-loads `.env`, so `prisma.config.ts` imports `dotenv/config`. The runtime `PrismaClient` uses the **`pg` driver adapter** (`@prisma/adapter-pg`). DB-level objects Prisma can't express in the schema (the `Σ=0` CONSTRAINT TRIGGER and the `due_events` VIEW) live in a hand-written migration (`--create-only`).
| Testing | **Vitest** | Unit tests for the billing engine & journal logic are **mandatory** — this is the error-prone core. |
| Charts | (dashboard phase) | Follow the dataviz guidance when building charts. |

### 9.1 Recommended default: **Drizzle**
Rationale: the ledger relies on DB-level invariants (`Σ postings = 0`, statement uniqueness, deferred constraints). Drizzle's SQL-first approach makes those constraints and triggers explicit and reviewable. If rapid schema iteration is more important early on, Prisma is acceptable — but decide **before** the first migration.

---

## 10. Suggested Project Structure

```
src/
  lib/
    money/            # Money type & integer arithmetic (§8)
    ledger/           # postings, Σ=0 invariant, balances, net worth (§2)
    billing/          # cycles, statements, installments, interest, payments (§5)
    dates/            # Asia/Jakarta cycle math, month-end clamping (§5.5)
    auth/             # password hashing, sessions, reset tokens, tenant scoping (§6.0)
    mail/             # SMTP / nodemailer transport & templates (§7)
  db/
    schema.prisma     # Prisma schema (§3); connection in prisma.config.ts (Prisma 7)
    seed/             # default chart of accounts (§4)
    migrations/       # incl. hand-written Σ=0 trigger + due_events view
  app/
    (auth)/           # login, register, forgot/reset password (§6.0)
    (dashboard)/      # net worth, outstanding debt, cash flow (§6.5)
    accounts/         # CRUD + billing params (§6.1)
    transactions/     # entry forms, reversal (§6.2)
    calendar/         # due events & reminders (§6.4)
  components/
  types/
docs/
  REQUIREMENTS.md     # this document (source of truth)
```

---

## 11. Testing Strategy

The billing/ledger core is the part most likely to be subtly wrong, so it is tested first and hardest.

- **Unit tests (Vitest), mandatory for:**
  - `Σ postings = 0` invariant (rejects unbalanced entries).
  - Balance & net-worth computation from postings.
  - Cycle assignment (§5.2), including transactions on/around the statement day.
  - Month-end clamping and due-date derivation (§5.5).
  - Installment schedule generation, including remainder reconciliation (§8.3).
  - Interest accrual on partial/minimum payments.
  - Idempotency of statement generation.
- **Golden scenario tests:** encode the §15 worked examples as tests; their numbers must match by hand.
- **Property test (optional):** for any random balanced transaction set, `Σ assets − Σ liabilities` equals the sum of all income/expense/equity effects.

---

## 12. Phased Roadmap

1. **MVP** (this document): ledger + credit card/paylater + billing cycle + due-date calendar + basic dashboard.
2. Budgeting/envelope + full reports (income statement & balance sheet) + CSV import + receipt OCR.
3. Automatic investment valuation (gold / mutual fund / stock / crypto price APIs).
4. **Tax module:** PPh 21 calculator (TER scheme, 2024+), final UMKM tax 0.5%, withholding slips → draft SPT 1770SS/S/1770 generator + asset list (DJP asset codes). Rate/PTKP tables versioned per tax year (P4).
5. Mobile/PWA offline-sync, household mode, advanced multi-currency.

---

## 13. Open Questions / Decisions to Confirm

1. **ORM:** Drizzle (recommended, §9.1) vs Prisma — confirm before the first migration.
2. ~~**Auth / multi-user:** single-user local first, or accounts from day one?~~ **RESOLVED (v1.3):** multi-user from day one — email + password, DB-backed sessions, forgot-password via SMTP, all data scoped per `user_id` (§3.10–§3.12, §6.0). Driven by the need to host safely. Open sub-question: enable **email verification** before first use, or defer it? (MVP may defer; `email_verified_at` column reserved.)
3. **Installment liability recognition:** full liability up front (current §5.3 decision) vs recognizing only each installment as it bills — confirm the §5.3 choice holds for paylater providers you use.
4. **Interest model fidelity:** flat monthly rate (MVP) vs average-daily-balance — MVP uses flat; confirm acceptable.
5. **Currency:** IDR-only for MVP (confirmed), multi-currency deferred.
6. **Timezone handling for cycle math:** all cycle boundaries evaluated in `Asia/Jakarta` — confirm.

---

## 14. Glossary

- **Posting / journal leg** — one side of a double-entry (a debit or a credit).
- **Statement / bill** — the summary of one billing cycle for a card/paylater.
- **Statement date (cut-off date)** — the day a cycle closes and the bill is computed.
- **Due date** — the deadline to pay the statement.
- **Posted date** — the date the issuer books the transaction; determines the cycle.
- **Net worth** — Assets − Liabilities.
- **Reversing entry** — a compensating transaction used to correct without deleting.
- **Accrual basis** — expenses recognized when incurred, not when the bill is paid.
- **PTKP** — *Penghasilan Tidak Kena Pajak*, the non-taxable income threshold (tax phase).
- **TER** — *Tarif Efektif Rata-rata*, the average effective PPh 21 rate scheme (in force since 2024).
- **SPT** — *Surat Pemberitahuan*, the Indonesian annual tax return.
- **DJP** — *Direktorat Jenderal Pajak*, the Indonesian tax authority.

---

## 15. Worked Examples (End-to-End Scenarios)

These scenarios double as **golden tests** (§11). All numbers must reconcile by hand.

### 15.1 Credit card over 2 cycles with a partial payment

**Setup:** Card BCA, `statement_day = 1`, `due_day = 18`, `interest_rate_monthly = 0.0175`, `min_payment_rate = 0.10`, `min_payment_floor = 50,000`.

**Cycle 1 (period Dec 2 – Jan 1):**
- Jan-adjacent purchases, posted dates within the cycle:
  - Dining Rp300,000 · Shopping Rp700,000 · Transport Rp150,000 → `purchases_total = 1,150,000`
- Statement cut on Jan 1: `previous_balance = 0`, `interest = 0`, `fees = 0` → `statement_balance = 1,150,000`.
- `minimum_due = max(round(1,150,000 × 0.10), 50,000) = 115,000`.
- User pays **Rp500,000** on Jan 15 (partial). Journal: `Dr Liability +500,000 / Cr Bank −500,000`. `paid_amount = 500,000`, status `PARTIALLY_PAID`. Carried balance = `1,150,000 − 500,000 = 650,000`.

**Cycle 2 (period Jan 2 – Feb 1):**
- Interest on the carried, interest-bearing balance: `round(650,000 × 0.0175) = 11,375`. Journal: `Dr Expense:Card Interest & Fees +11,375 / Cr Liability −11,375`.
- New purchases: Groceries Rp400,000 → `purchases_total = 400,000`.
- Statement cut on Feb 1: `previous_balance = 650,000`, `interest_charged = 11,375`, `purchases_total = 400,000` → `statement_balance = 1,061,375`.
- `minimum_due = max(round(1,061,375 × 0.10), 50,000) = 106,138` (106,137.5 → round-half-up → 106,138).

**Check:** the liability account balance after Feb 1, before any Cycle-2 payment, equals `1,061,375`, and it equals `Σ` of all its postings. Net worth reflects the Rp500,000 cash outflow and the Rp11,375 interest expense.

### 15.2 Paylater 3× installment (0%)

**Setup:** SPayLater, `statement_day = 25`, `due_offset_days = 5` (due = statement + 5 days), `interest_rate_monthly = 0`.

- **Jul 10:** buy a Rp1,500,000 item, 3× installments, `start_date = Jul` (first installment due in the July cycle).
  - Purchase journal: `Dr Expense:Shopping +1,500,000 / Cr Liability:SPayLater −1,500,000`.
  - `installment_plans`: principal 1,500,000, tenor 3, monthly_amount 500,000.
  - `installment_schedules`: seq 1 due in Jul cycle (Rp500,000), seq 2 in Aug (Rp500,000), seq 3 in Sep (Rp500,000). Components: principal 500,000 / interest 0 each; remainder 0.
- **Jul 25 statement:** `installments_due = 500,000`, `purchases_total` excludes the installment portion already accounted as installments → `statement_balance = 500,000`, `due_date = Jul 30`.
- **Aug / Sep** statements each bill the next Rp500,000.

**Check:** across the 3 cycles, total billed = Rp1,500,000 = the original liability. After all three are paid, the SPayLater liability returns to 0 and net worth reflects a total Rp1,500,000 cash outflow spread over the payment dates.

### 15.3 Bill payment is not an expense

- Cycle-1 bill of Rp1,150,000 (from 15.1) paid in full on the due date from Bank.
  - Journal: `Dr Liability:CreditCard BCA +1,150,000 / Cr Asset:Bank −1,150,000`.
- **Check:** monthly cash-flow (Income − Expense) is **unchanged** by this payment (the expenses were recognized at purchase time in the earlier cycle); only the balance sheet moves (bank down, liability down). This is the single most common place naive apps double-count — it must be correct here.

### 15.4 Money spread across many accounts (aggregate liquidity)

**Setup:** the user's asset accounts —
- Bank BCA: Rp5,000,000 · Bank Mandiri: Rp2,000,000 · Bank Jago: Rp1,000,000
- GoPay: Rp250,000 · ShopeePay: Rp150,000 · Wallet Cash: Rp600,000

- **Total Liquid** = `5,000,000 + 2,000,000 + 1,000,000 + 250,000 + 150,000 + 600,000 = 9,000,000`. Subtotals: Banks Rp8,000,000, E-wallets Rp400,000, Cash Rp600,000.
- **Transfer** Rp500,000 from BCA to GoPay (top-up, no fee): `Dr Asset:GoPay +500,000 / Cr Asset:Bank BCA −500,000`. BCA → Rp4,500,000, GoPay → Rp750,000. **Total Liquid stays Rp9,000,000**; income and expense unchanged.
- **Same top-up but WITH a Rp1,000 admin fee** (§2.2e2): `Dr Asset:GoPay +500,000 / Dr Expense:Admin & Transfer Fees +1,000 / Cr Asset:Bank BCA −501,000`. BCA → Rp4,499,000, GoPay → Rp750,000. **Total Liquid drops by exactly the Rp1,000 fee** to Rp8,999,000, and monthly expense rises by Rp1,000 — because the fee is the only part that truly left your net worth.
- **Cash-coverage check:** if upcoming card/paylater dues in the next 14 days total Rp7,200,000, the indicator shows *covered* (9,000,000 ≥ 7,200,000). If a new Rp2,500,000 due appears, cumulative dues Rp9,700,000 > Rp9,000,000 → indicator flips to *not covered*.

**Check:** the aggregate "Where is my money" view's Total Liquid always equals the sum of the individual derived balances, and it is exactly the figure the due-date coverage indicator (§5.6, §6.4) consumes.

---

## Changelog

- **v1.3** (2026-07-08) — Added **authentication & multi-user** as an MVP feature (§1.1 item 6, §6.0): email + password login, DB-backed revocable sessions, and forgot-password via SMTP reset link. New tables `users`/`sessions`/`password_reset_tokens` (§3.10–§3.12); the four aggregate roots gain a `user_id` FK and are scoped per user (multi-tenant). Resolved Open Question §13.2 (multi-user from day one). Extended §7 with authentication/SMTP rules and §9 with auth/hashing/email + a Prisma 7 config note.
- **v1.2** (2026-07-08) — Added optional admin/transfer fee on transfers & e-wallet top-ups as a 3-leg entry (§2.2e2, §6.1a, §15.4) and a new `Admin & Transfer Fees` expense category (§4). Fee is optional; when 0 it collapses to a plain 2-leg transfer.
- **v1.1** (2026-07-08) — Added multi-account "money storage" management as an explicit MVP feature (§1.1 item 2, §6.1a, §15.4): unlimited bank / e-wallet / cash accounts, transfers, aggregate "Where is my money" view with Total Liquid, per-account history, and balance reconciliation.
- **v1.0** (2026-07-08) — Initial draft.

_Any change to this document must bump the version in the header and record a short changelog summary._
