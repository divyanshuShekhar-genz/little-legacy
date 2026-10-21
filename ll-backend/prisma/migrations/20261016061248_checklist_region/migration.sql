/*
  Warnings:

  - Added the required column `regionId` to the `checklist_items` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "checklist_items" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "regionId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "checklist_items_regionId_week_position_idx" ON "checklist_items"("regionId", "week", "position");

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "learning_regions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
