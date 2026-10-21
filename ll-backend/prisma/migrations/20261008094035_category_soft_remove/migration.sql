-- DropIndex
DROP INDEX "activity_categories_areaId_name_key";

-- AlterTable
ALTER TABLE "activity_categories" ADD COLUMN     "removedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "activity_categories_areaId_idx" ON "activity_categories"("areaId");
