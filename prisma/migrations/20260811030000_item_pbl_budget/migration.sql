-- PBL budget tag for equipment (and any item)

ALTER TABLE "Item" ADD COLUMN IF NOT EXISTS "pblBudget" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "Item_pblBudget_idx" ON "Item"("pblBudget");
