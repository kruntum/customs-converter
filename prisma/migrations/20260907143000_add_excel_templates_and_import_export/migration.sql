-- DropForeignKey
ALTER TABLE "exchange_logs" DROP CONSTRAINT IF EXISTS "exchange_logs_company_id_fkey";

-- DropForeignKey
ALTER TABLE "exchange_logs" DROP CONSTRAINT IF EXISTS "exchange_logs_currency_code_fkey";

-- DropForeignKey
ALTER TABLE "exchange_logs" DROP CONSTRAINT IF EXISTS "exchange_logs_receipt_id_fkey";

-- DropForeignKey
ALTER TABLE "fcd_holding_pools" DROP CONSTRAINT IF EXISTS "fcd_holding_pools_company_id_fkey";

-- DropForeignKey
ALTER TABLE "fcd_holding_pools" DROP CONSTRAINT IF EXISTS "fcd_holding_pools_currency_code_fkey";

-- DropForeignKey
ALTER TABLE "payment_allocations" DROP CONSTRAINT IF EXISTS "payment_allocations_receipt_id_fkey";

-- DropForeignKey
ALTER TABLE "payment_allocations" DROP CONSTRAINT IF EXISTS "payment_allocations_transaction_id_fkey";

-- DropForeignKey
ALTER TABLE "payment_allocations" DROP CONSTRAINT IF EXISTS "payment_allocations_wallet_tx_id_fkey";

-- DropForeignKey
ALTER TABLE "receipts" DROP CONSTRAINT IF EXISTS "receipts_company_id_fkey";

-- DropForeignKey
ALTER TABLE "receipts" DROP CONSTRAINT IF EXISTS "receipts_currency_code_fkey";

-- DropForeignKey
ALTER TABLE "receipts" DROP CONSTRAINT IF EXISTS "receipts_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "wallet_transactions" DROP CONSTRAINT IF EXISTS "wallet_transactions_company_id_fkey";

-- DropForeignKey
ALTER TABLE "wallet_transactions" DROP CONSTRAINT IF EXISTS "wallet_transactions_customer_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "transactions_payment_status_idx";

-- AlterTable
ALTER TABLE "customers" DROP COLUMN IF EXISTS "wallet_balance_thb";

-- AlterTable
ALTER TABLE "invoice_items" ADD COLUMN IF NOT EXISTS "fob_price" DECIMAL(18,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "freight" DECIMAL(18,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "insurance" DECIMAL(18,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "quantity" DECIMAL(18,4) DEFAULT 1;

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN IF EXISTS "paid_thb",
DROP COLUMN IF EXISTS "payment_status",
ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'IMPORT';

-- DropTable
DROP TABLE IF EXISTS "exchange_logs";

-- DropTable
DROP TABLE IF EXISTS "fcd_holding_pools";

-- DropTable
DROP TABLE IF EXISTS "payment_allocations";

-- DropTable
DROP TABLE IF EXISTS "receipts";

-- DropTable
DROP TABLE IF EXISTS "wallet_transactions";

-- CreateTable
CREATE TABLE IF NOT EXISTS "excel_templates" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "mapping" JSONB NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "excel_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "excel_templates_company_id_idx" ON "excel_templates"("company_id");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'excel_templates_company_id_fkey'
    ) THEN
        ALTER TABLE "excel_templates" ADD CONSTRAINT "excel_templates_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'excel_templates_created_by_fkey'
    ) THEN
        ALTER TABLE "excel_templates" ADD CONSTRAINT "excel_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
