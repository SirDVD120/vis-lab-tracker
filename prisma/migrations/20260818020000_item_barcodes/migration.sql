-- CreateTable
CREATE TABLE "ItemBarcode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "itemId" TEXT NOT NULL,

    CONSTRAINT "ItemBarcode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ItemBarcode_code_key" ON "ItemBarcode"("code");

-- CreateIndex
CREATE INDEX "ItemBarcode_itemId_idx" ON "ItemBarcode"("itemId");

-- AddForeignKey
ALTER TABLE "ItemBarcode" ADD CONSTRAINT "ItemBarcode_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing Item.barcode values (skip blanks)
INSERT INTO "ItemBarcode" ("id", "code", "createdAt", "itemId")
SELECT
  gen_random_uuid()::text,
  TRIM(i.barcode),
  CURRENT_TIMESTAMP,
  i.id
FROM "Item" i
WHERE i.barcode IS NOT NULL
  AND TRIM(i.barcode) <> ''
ON CONFLICT ("code") DO NOTHING;

-- AlterTable
ALTER TABLE "Item" DROP COLUMN "barcode";
