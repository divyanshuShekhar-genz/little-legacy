import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DraftsService, type Tx } from '../drafts/drafts.service';
import { currentArea, currentCategory } from '../../common/utils/region';
import { freezeEarnedLevels } from '../../common/utils/child-levels';
import { hasAnySection, type SessionAdmin } from '../../common/types/session-admin';
import { DEFAULT_ICON_COLOUR, type CreateLevelDto, type DeleteLevelDto, type LevelQueryDto, type UpdateLevelDto } from './dto/level.dto';

/**
 * Area levels (guide §9; prototype Developmental Milestones → Levels, and the "Level requirements"
 * panel on Questionnaires & Levels). Unlocking needs the score AND the mastered count — separate
 * from the subscription gate. Each area (or each of its categories) has its own ladder; levels are
 * shared by every age (the age tab only filters activity counts).
 *
 * Children's levels are worked out from these thresholds, so every change that could lower one —
 * editing a level, deleting it — first freezes each child's current earned level
 * (freezeEarnedLevels; decision 2026-10-08, option A). Levels never go down.
 */

export const LEVEL_ENTITY = 'Level';
const SECTION = 'Levels';
/** Milestones (Levels page) or Questionnaires & Levels ("Level requirements" → Configure). */
export const LEVEL_SECTIONS = ['developmentalMilestones', 'questionnairesLevels'] as const;
const LADDER = 'Choose a category in this development area.';

type LevelPayload =
  | { delete: true }
  | {
      delete?: false;
      areaId: string;
      categoryId: string | null;
      number: number;
      title: string | null;
      icon: string | null;
      iconColor: string;
      requiredScore: number;
      requiredMastered: number;
    };
type LevelFields = Exclude<LevelPayload, { delete: true }>;

const snapshot = (tx: Tx, id: string) =>
  tx.level.findUnique({
    where: { id },
    select: { id: true, areaId: true, categoryId: true, number: true, title: true, icon: true, iconColor: true, requiredScore: true, requiredMastered: true },
  });

/**
 * The ladder a level lives on: the area itself while it has no categories, otherwise one of its
 * current categories (Area → Category (optional) → Levels).
 */
async function assertLadder(db: Tx, areaId: string, categoryId: string | null) {
  const area = await currentArea(db, areaId);
  if (categoryId) {
    const category = await currentCategory(db, categoryId).catch(() => null);
    if (!category || category.areaId !== areaId) throw new BadRequestException(LADDER);
  } else if (await db.activityCategory.count({ where: { areaId, removedAt: null } })) {
    throw new BadRequestException(LADDER);
  }
  return area;
}

/** Unique per ladder. Checked here because PostgreSQL treats NULL categories as distinct. */
async function assertNumberFree(db: Tx, p: { areaId: string; categoryId: string | null; number: number }, excludeId: string | null) {
  const taken = await db.level.findFirst({
    where: { areaId: p.areaId, categoryId: p.categoryId, number: p.number, ...(excludeId ? { id: { not: excludeId } } : {}) },
  });
  if (taken) throw new ConflictException('This level number already exists.');
}

/** Activities still offered on this level. Withdrawn ones keep their history and just lose the link. */
const liveActivities = (db: Tx, levelId: string) => db.activity.count({ where: { levelId, withdrawnAt: null } });

@Injectable()
export class LevelsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly drafts: DraftsService,
  ) {}

  onModuleInit() {
    this.drafts.register<LevelPayload>(LEVEL_ENTITY, {
      snapshot,
      apply: async (tx, id, payload) => {
        if (payload.delete) {
          const level = id ? await tx.level.findUnique({ where: { id } }) : null;
          if (!level) throw new NotFoundException('Level not found');
          if (await liveActivities(tx, level.id)) throw new BadRequestException("Move or remove this level's activities first.");
          await freezeEarnedLevels(tx, level.areaId);
          await tx.level.delete({ where: { id: level.id } });
          return level.id;
        }

        await assertLadder(tx, payload.areaId, payload.categoryId);
        await assertNumberFree(tx, payload, id);
        const data = {
          number: payload.number,
          title: payload.title,
          icon: payload.icon,
          iconColor: payload.iconColor,
          requiredScore: payload.requiredScore,
          requiredMastered: payload.requiredMastered,
        };
        if (id) {
          // New thresholds could lower a child's computed level: lock in what was earned first.
          await freezeEarnedLevels(tx, payload.areaId);
          await tx.level.update({ where: { id }, data });
          return id;
        }
        // Adding a level can only open a new step, never lower one: nothing to freeze.
        return (await tx.level.create({ data: { ...data, areaId: payload.areaId, categoryId: payload.categoryId } })).id;
      },
    });
  }

  private assertCanManage(admin: SessionAdmin) {
    if (!hasAnySection(admin, LEVEL_SECTIONS)) throw new ForbiddenException('You do not have access to this section');
  }

  /** Any signed-in admin. One ladder, with each level's activity count (for the age tab, if given). */
  async list({ areaId, categoryId = null, age }: LevelQueryDto) {
    await assertLadder(this.prisma, areaId, categoryId);
    const levels = await this.prisma.level.findMany({
      where: { areaId, categoryId },
      include: { _count: { select: { activities: { where: { withdrawnAt: null, ...(age !== undefined ? { age } : {}) } } } } },
      orderBy: { number: 'asc' },
    });
    return {
      levels: levels.map(({ _count, ...l }) => ({
        id: l.id,
        number: l.number,
        title: l.title,
        icon: l.icon,
        iconColor: l.iconColor ?? DEFAULT_ICON_COLOUR,
        requiredScore: l.requiredScore,
        requiredMastered: l.requiredMastered,
        activityCount: _count.activities,
      })),
      /** Default for "Level number" in the modal: highest + 1. */
      nextNumber: Math.max(0, ...levels.map((l) => l.number)) + 1,
    };
  }

  /** A level whose area and category are current, or 404. */
  private async current(id: string) {
    const level = await this.prisma.level.findUnique({ where: { id }, include: { area: true, category: true } });
    if (!level || level.area.removedAt || level.category?.removedAt) throw new NotFoundException('Level not found');
    return level;
  }

  async create(admin: SessionAdmin, dto: CreateLevelDto) {
    this.assertCanManage(admin);
    const categoryId = dto.categoryId ?? null;
    const area = await assertLadder(this.prisma, dto.areaId, categoryId);
    const payload: LevelFields = {
      areaId: area.id,
      categoryId,
      number: dto.number,
      title: dto.title ?? null,
      icon: dto.icon ?? null,
      iconColor: dto.iconColor ?? DEFAULT_ICON_COLOUR,
      requiredScore: dto.requiredScore,
      requiredMastered: dto.requiredMastered,
    };
    await assertNumberFree(this.prisma, payload, null);
    return this.drafts.saveOrDraft<LevelPayload>({ admin, mode: dto.mode, section: SECTION, entityType: LEVEL_ENTITY, entityId: null, regionId: area.regionId, payload, label: `${area.name} · Level ${dto.number}` });
  }

  async update(admin: SessionAdmin, id: string, dto: UpdateLevelDto) {
    this.assertCanManage(admin);
    const level = await this.current(id);
    const payload: LevelFields = {
      areaId: level.areaId,
      categoryId: level.categoryId,
      number: dto.number ?? level.number,
      title: dto.title !== undefined ? dto.title : level.title,
      icon: dto.icon !== undefined ? dto.icon : level.icon,
      iconColor: dto.iconColor ?? level.iconColor ?? DEFAULT_ICON_COLOUR,
      requiredScore: dto.requiredScore ?? level.requiredScore,
      requiredMastered: dto.requiredMastered ?? level.requiredMastered,
    };
    await assertNumberFree(this.prisma, payload, id);
    return this.drafts.saveOrDraft<LevelPayload>({ admin, mode: dto.mode, section: SECTION, entityType: LEVEL_ENTITY, entityId: id, regionId: level.area.regionId, payload, label: `${level.area.name} · Level ${payload.number}` });
  }

  async remove(admin: SessionAdmin, id: string, dto: DeleteLevelDto) {
    this.assertCanManage(admin);
    const level = await this.current(id);
    if (await liveActivities(this.prisma, id)) throw new BadRequestException("Move or remove this level's activities first.");
    return this.drafts.saveOrDraft<LevelPayload>({ admin, mode: dto.mode, section: SECTION, entityType: LEVEL_ENTITY, entityId: id, regionId: level.area.regionId, payload: { delete: true }, label: `Removed ${level.area.name} · Level ${level.number}` });
  }
}
