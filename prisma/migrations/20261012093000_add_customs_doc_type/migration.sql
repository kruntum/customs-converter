-- AlterTable
ALTER TABLE "transactions" 
ADD COLUMN IF NOT EXISTS "customs_doc_type" TEXT,
ADD COLUMN IF NOT EXISTS "customs_doc_type_name" TEXT;
