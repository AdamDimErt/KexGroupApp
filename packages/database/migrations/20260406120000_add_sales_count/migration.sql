-- AlterTable: add salesCount to FinancialSnapshot
ALTER TABLE "finance"."FinancialSnapshot" ADD COLUMN "salesCount" INTEGER NOT NULL DEFAULT 0;
