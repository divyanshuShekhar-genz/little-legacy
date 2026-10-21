-- DropIndex
DROP INDEX "development_areas_regionId_name_key";

-- AlterTable
ALTER TABLE "development_areas" ADD COLUMN     "removedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "development_areas_regionId_idx" ON "development_areas"("regionId");
