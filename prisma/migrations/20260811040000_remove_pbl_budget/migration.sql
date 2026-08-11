-- Remove PBL budget tag

DROP INDEX IF EXISTS "Item_pblBudget_idx";
ALTER TABLE "Item" DROP COLUMN IF EXISTS "pblBudget";
