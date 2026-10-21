import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

/**
 * Everything in Activity Management belongs to one regional learning category (guide §5).
 * Throws 400 when `regionId` doesn't exist, so a bad id never creates orphan content.
 */
export async function assertRegion(db: Prisma.TransactionClient, regionId: string) {
  const region = await db.learningRegion.findUnique({ where: { id: regionId }, select: { id: true } });
  if (!region) throw new BadRequestException('Choose a regional learning category.');
}

/** A development area that hasn't been removed (part 1, `removedAt`), or 404. */
export async function currentArea(db: Prisma.TransactionClient, areaId: string) {
  const area = await db.developmentArea.findUnique({ where: { id: areaId } });
  if (!area || area.removedAt) throw new NotFoundException('Development area not found');
  return area;
}

/** A category that hasn't been removed, or 404. */
export async function currentCategory(db: Prisma.TransactionClient, categoryId: string) {
  const category = await db.activityCategory.findUnique({ where: { id: categoryId }, include: { area: true } });
  if (!category || category.removedAt || category.area.removedAt) throw new NotFoundException('Category not found');
  return category;
}
