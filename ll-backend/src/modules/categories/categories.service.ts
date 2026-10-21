import { ConflictException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DraftsService, type Tx } from '../drafts/drafts.service';
import { currentArea, currentCategory } from '../../common/utils/region';
import { freezeEarnedLevels } from '../../common/utils/child-levels';
import type { SessionAdmin } from '../../common/types/session-admin';
import type { CreateCategoryDto, DeleteCategoryDto, UpdateCategoryDto } from './dto/category.dto';

/**
 * Activity categories (prototype Developmental Milestones: Area → Categories → Levels). Optional:
 * "Each category has its own levels and activities."
 *
 * - Adding an area's FIRST category moves the area's existing levels and activities into it
 *   (prototype). Earned levels are frozen first (decision 2026-10-08, option A).
 * - Delete, as for areas: no child history → deleted with its levels and activities; otherwise
 *   removed (`removedAt`): hidden, activities withdrawn, levels kept (earned levels come from them).
 *   Either way children's earned levels are frozen first, so nothing a child earned goes down.
 */

export const CATEGORY_ENTITY = 'ActivityCategory';
const SECTION = 'Developmental Milestones';

type CategoryPayload =
  | { delete: true }
  | { delete?: false; areaId: string; name: string; description: string | null };
type CategoryFields = Exclude<CategoryPayload, { delete: true }>;

const snapshot = (tx: Tx, id: string) =>
  tx.activityCategory.findUnique({ where: { id }, select: { id: true, areaId: true, name: true, description: true, removedAt: true } });

async function assertNameFree(db: Tx, areaId: string, name: string, excludeId: string | null) {
  const taken = await db.activityCategory.findFirst({
    where: { areaId, removedAt: null, name: { equals: name, mode: 'insensitive' }, ...(excludeId ? { id: { not: excludeId } } : {}) },
  });
  if (taken) throw new ConflictException('This category already exists in this development area. Use a different name.');
}

async function hasChildHistory(db: Tx, categoryId: string) {
  const counts = await Promise.all([
    db.activityAttempt.count({ where: { activity: { categoryId } } }),
    db.weeklyAssignment.count({ where: { activity: { categoryId } } }),
    db.childFamilyStage.count({ where: { family: { categoryId } } }),
    db.childAreaLevel.count({ where: { categoryId } }),
  ]);
  return counts.some((n) => n > 0);
}

@Injectable()
export class CategoriesService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly drafts: DraftsService,
  ) {}

  onModuleInit() {
    this.drafts.register<CategoryPayload>(CATEGORY_ENTITY, {
      snapshot,
      apply: async (tx, id, payload) => {
        if (payload.delete) {
          if (!id) throw new NotFoundException('Category not found');
          const category = await currentCategory(tx, id);
          await removeCategory(tx, category.id, category.areaId);
          return category.id;
        }

        await currentArea(tx, payload.areaId);
        await assertNameFree(tx, payload.areaId, payload.name, id);
        if (id) {
          await tx.activityCategory.update({ where: { id }, data: { name: payload.name, description: payload.description } });
          return id;
        }

        const isFirst = (await tx.activityCategory.count({ where: { areaId: payload.areaId, removedAt: null } })) === 0;
        const created = await tx.activityCategory.create({ data: { areaId: payload.areaId, name: payload.name, description: payload.description } });
        if (isFirst) {
          // "Existing levels and activities will move into this first category." The levels change
          // ladder, so lock in what children earned on the old one first.
          await freezeEarnedLevels(tx, payload.areaId);
          await tx.level.updateMany({ where: { areaId: payload.areaId, categoryId: null }, data: { categoryId: created.id } });
          await tx.activity.updateMany({ where: { areaId: payload.areaId, categoryId: null }, data: { categoryId: created.id } });
        }
        return created.id;
      },
    });
  }

  /** Any signed-in admin. Current categories of a current area, with their counts. */
  async list(areaId: string) {
    await currentArea(this.prisma, areaId);
    const categories = await this.prisma.activityCategory.findMany({
      where: { areaId, removedAt: null },
      include: { _count: { select: { levels: true, activities: { where: { withdrawnAt: null } } } } },
      orderBy: { name: 'asc' },
    });
    return {
      categories: categories.map(({ _count, ...c }) => ({ id: c.id, name: c.name, description: c.description, counts: _count })),
    };
  }

  async create(admin: SessionAdmin, dto: CreateCategoryDto) {
    const area = await currentArea(this.prisma, dto.areaId);
    await assertNameFree(this.prisma, area.id, dto.name, null);
    const payload: CategoryFields = { areaId: area.id, name: dto.name, description: dto.description };
    return this.drafts.saveOrDraft<CategoryPayload>({ admin, mode: dto.mode, section: SECTION, entityType: CATEGORY_ENTITY, entityId: null, regionId: area.regionId, payload, label: `${area.name} · ${dto.name}` });
  }

  async update(admin: SessionAdmin, id: string, dto: UpdateCategoryDto) {
    const category = await currentCategory(this.prisma, id);
    const payload: CategoryFields = {
      areaId: category.areaId,
      name: dto.name ?? category.name,
      description: dto.description !== undefined ? dto.description : category.description,
    };
    await assertNameFree(this.prisma, category.areaId, payload.name, id);
    return this.drafts.saveOrDraft<CategoryPayload>({ admin, mode: dto.mode, section: SECTION, entityType: CATEGORY_ENTITY, entityId: id, regionId: category.area.regionId, payload, label: `${category.area.name} · ${payload.name}` });
  }

  async remove(admin: SessionAdmin, id: string, dto: DeleteCategoryDto) {
    const category = await currentCategory(this.prisma, id);
    return this.drafts.saveOrDraft<CategoryPayload>({ admin, mode: dto.mode, section: SECTION, entityType: CATEGORY_ENTITY, entityId: id, regionId: category.area.regionId, payload: { delete: true }, label: `Removed ${category.area.name} · ${category.name}` });
  }
}

async function removeCategory(tx: Tx, categoryId: string, areaId: string) {
  // History is checked BEFORE freezing: the freeze itself writes stored levels for this category.
  const history = await hasChildHistory(tx, categoryId);
  await freezeEarnedLevels(tx, areaId);
  if (!history) {
    // Activities first (their link to the category only nulls on delete); levels cascade.
    await tx.activity.deleteMany({ where: { categoryId } });
    await tx.activityCategory.delete({ where: { id: categoryId } });
    return;
  }
  const now = new Date();
  const activities = await tx.activity.findMany({ where: { categoryId }, select: { id: true } });
  await tx.activity.updateMany({ where: { categoryId, withdrawnAt: null }, data: { withdrawnAt: now, status: 'WITHDRAWN' } });
  // Withdrawn work no longer counts towards mandatory requirements (guide §13).
  await tx.mandatoryActivity.deleteMany({ where: { activityId: { in: activities.map((a) => a.id) } } });
  await tx.activityFamily.updateMany({ where: { categoryId }, data: { archived: true } });
  await tx.activityCategory.update({ where: { id: categoryId }, data: { removedAt: now } });
}
