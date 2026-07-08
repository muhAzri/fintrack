-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'INCOME', 'EXPENSE', 'EQUITY');

-- CreateEnum
CREATE TYPE "AccountSubtype" AS ENUM ('CASH', 'BANK', 'EWALLET', 'RECEIVABLE', 'INVESTMENT', 'CREDIT_CARD', 'PAYLATER', 'LOAN', 'PERSONAL_DEBT', 'OTHER');

-- CreateEnum
CREATE TYPE "CategoryKind" AS ENUM ('EXPENSE', 'INCOME');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('EXPENSE', 'INCOME', 'TRANSFER', 'CC_PAYMENT', 'ADJUSTMENT', 'INSTALLMENT_PURCHASE', 'REFUND');

-- CreateEnum
CREATE TYPE "CreditInstrument" AS ENUM ('CREDIT_CARD', 'PAYLATER');

-- CreateEnum
CREATE TYPE "StatementStatus" AS ENUM ('OPEN', 'CLOSED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "InstallmentPlanStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InstallmentScheduleStatus" AS ENUM ('SCHEDULED', 'BILLED', 'PAID');

-- CreateEnum
CREATE TYPE "RecurringFrequency" AS ENUM ('MONTHLY', 'WEEKLY', 'YEARLY', 'CUSTOM');

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "subtype" "AccountSubtype",
    "currency" CHAR(3) NOT NULL DEFAULT 'IDR',
    "openingBalance" BIGINT NOT NULL DEFAULT 0,
    "openingDate" DATE,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "last4" CHAR(4),
    "icon" TEXT,
    "color" TEXT,
    "group" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "kind" "CategoryKind" NOT NULL,
    "taxRelevant" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "postedDate" DATE,
    "description" TEXT NOT NULL,
    "merchant" TEXT,
    "type" "TransactionType" NOT NULL,
    "attachmentUrl" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reversalOfId" TEXT,
    "statementId" TEXT,
    "installmentPlanId" TEXT,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "postings" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "postings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_accounts" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "instrument" "CreditInstrument" NOT NULL,
    "creditLimit" BIGINT,
    "statementDay" INTEGER NOT NULL,
    "dueDay" INTEGER,
    "dueOffsetDays" INTEGER,
    "gracePeriodDays" INTEGER,
    "interestRateMonthly" DECIMAL(9,6) NOT NULL,
    "minPaymentRate" DECIMAL(9,6),
    "minPaymentFloor" BIGINT,
    "lateFee" BIGINT,
    "autopaySourceAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "statements" (
    "id" TEXT NOT NULL,
    "creditAccountId" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "previousBalance" BIGINT NOT NULL DEFAULT 0,
    "purchasesTotal" BIGINT NOT NULL DEFAULT 0,
    "installmentsDue" BIGINT NOT NULL DEFAULT 0,
    "interestCharged" BIGINT NOT NULL DEFAULT 0,
    "feesCharged" BIGINT NOT NULL DEFAULT 0,
    "creditsTotal" BIGINT NOT NULL DEFAULT 0,
    "statementBalance" BIGINT NOT NULL DEFAULT 0,
    "minimumDue" BIGINT NOT NULL DEFAULT 0,
    "paidAmount" BIGINT NOT NULL DEFAULT 0,
    "status" "StatementStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "statements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "installment_plans" (
    "id" TEXT NOT NULL,
    "creditAccountId" TEXT NOT NULL,
    "purchaseTransactionId" TEXT NOT NULL,
    "principal" BIGINT NOT NULL,
    "tenorMonths" INTEGER NOT NULL,
    "interestRateMonthly" DECIMAL(9,6) NOT NULL,
    "adminFee" BIGINT,
    "monthlyAmount" BIGINT NOT NULL,
    "startDate" DATE NOT NULL,
    "status" "InstallmentPlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "installment_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "installment_schedules" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "dueDate" DATE NOT NULL,
    "principalComponent" BIGINT NOT NULL,
    "interestComponent" BIGINT NOT NULL,
    "totalAmount" BIGINT NOT NULL,
    "statementId" TEXT,
    "status" "InstallmentScheduleStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "installment_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "templateJson" JSONB NOT NULL,
    "frequency" "RecurringFrequency" NOT NULL,
    "nextRun" DATE NOT NULL,
    "autoPost" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accounts_type_idx" ON "accounts"("type");

-- CreateIndex
CREATE INDEX "accounts_subtype_idx" ON "accounts"("subtype");

-- CreateIndex
CREATE INDEX "accounts_isArchived_idx" ON "accounts"("isArchived");

-- CreateIndex
CREATE INDEX "categories_parentId_idx" ON "categories"("parentId");

-- CreateIndex
CREATE INDEX "categories_kind_idx" ON "categories"("kind");

-- CreateIndex
CREATE INDEX "transactions_date_idx" ON "transactions"("date");

-- CreateIndex
CREATE INDEX "transactions_postedDate_idx" ON "transactions"("postedDate");

-- CreateIndex
CREATE INDEX "transactions_type_idx" ON "transactions"("type");

-- CreateIndex
CREATE INDEX "transactions_statementId_idx" ON "transactions"("statementId");

-- CreateIndex
CREATE INDEX "transactions_installmentPlanId_idx" ON "transactions"("installmentPlanId");

-- CreateIndex
CREATE INDEX "transactions_reversalOfId_idx" ON "transactions"("reversalOfId");

-- CreateIndex
CREATE INDEX "postings_transactionId_idx" ON "postings"("transactionId");

-- CreateIndex
CREATE INDEX "postings_accountId_idx" ON "postings"("accountId");

-- CreateIndex
CREATE INDEX "postings_categoryId_idx" ON "postings"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "credit_accounts_accountId_key" ON "credit_accounts"("accountId");

-- CreateIndex
CREATE INDEX "credit_accounts_instrument_idx" ON "credit_accounts"("instrument");

-- CreateIndex
CREATE INDEX "statements_creditAccountId_idx" ON "statements"("creditAccountId");

-- CreateIndex
CREATE INDEX "statements_status_idx" ON "statements"("status");

-- CreateIndex
CREATE INDEX "statements_dueDate_idx" ON "statements"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "statements_creditAccountId_periodEnd_key" ON "statements"("creditAccountId", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "installment_plans_purchaseTransactionId_key" ON "installment_plans"("purchaseTransactionId");

-- CreateIndex
CREATE INDEX "installment_plans_creditAccountId_idx" ON "installment_plans"("creditAccountId");

-- CreateIndex
CREATE INDEX "installment_plans_status_idx" ON "installment_plans"("status");

-- CreateIndex
CREATE INDEX "installment_schedules_planId_idx" ON "installment_schedules"("planId");

-- CreateIndex
CREATE INDEX "installment_schedules_statementId_idx" ON "installment_schedules"("statementId");

-- CreateIndex
CREATE INDEX "installment_schedules_status_idx" ON "installment_schedules"("status");

-- CreateIndex
CREATE INDEX "installment_schedules_dueDate_idx" ON "installment_schedules"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "installment_schedules_planId_sequence_key" ON "installment_schedules"("planId", "sequence");

-- CreateIndex
CREATE INDEX "recurring_rules_nextRun_idx" ON "recurring_rules"("nextRun");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "statements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_installmentPlanId_fkey" FOREIGN KEY ("installmentPlanId") REFERENCES "installment_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postings" ADD CONSTRAINT "postings_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postings" ADD CONSTRAINT "postings_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postings" ADD CONSTRAINT "postings_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_accounts" ADD CONSTRAINT "credit_accounts_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_accounts" ADD CONSTRAINT "credit_accounts_autopaySourceAccountId_fkey" FOREIGN KEY ("autopaySourceAccountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statements" ADD CONSTRAINT "statements_creditAccountId_fkey" FOREIGN KEY ("creditAccountId") REFERENCES "credit_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installment_plans" ADD CONSTRAINT "installment_plans_creditAccountId_fkey" FOREIGN KEY ("creditAccountId") REFERENCES "credit_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installment_plans" ADD CONSTRAINT "installment_plans_purchaseTransactionId_fkey" FOREIGN KEY ("purchaseTransactionId") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installment_schedules" ADD CONSTRAINT "installment_schedules_planId_fkey" FOREIGN KEY ("planId") REFERENCES "installment_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installment_schedules" ADD CONSTRAINT "installment_schedules_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "statements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
