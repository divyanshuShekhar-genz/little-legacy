import { BadRequestException, ForbiddenException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DraftsService, type Tx } from '../drafts/drafts.service';
import { assertRegion, currentArea, currentCategory } from '../../common/utils/region';
import { freezeEarnedLevels } from '../../common/utils/child-levels';
import { hasAnySection, type SessionAdmin } from '../../common/types/session-admin';
import type { PlanTier } from '../../common/rules';
import type { ActivityDto, ActivityQueryDto, DeleteActivityDto } from './dto/activity.dto';

/**
 * Activities (guide §9, §12–13; prototype activity editor, "Manage Activities" registry and the
 * level activity list). Everything goes through drafts; "Availability" (Draft / Published) is a
 * field on the activity, separate from approving the edit.
 *
 * Decisions 2026-10-08:
 * - Delete: no child history → deleted (with steps, previews, mandatory picks, country rules);
 *   otherwise withdrawn (`withdrawnAt`): no longer offered, history and earned scores kept, taken
 *   out of mandatory sets (guide §13). No restore.
 * - Once children have records, the development area is locked (their points count in that area).
 *   Mastery count, category and level changes freeze earned levels first (OPEN_QUESTIONS Q21).
 * - Age must be one of the region's age groups. Preview images must be files from POST /api/uploads.
 */

export const ACTIVITY_ENTITY = 'Activity';
const SECTION = 'Activities';
/** The registry (Activities) and the Milestones level page both have the editor. */
export const ACTIVITY_SECTIONS = ['activities', 'developmentalMilestones'] as const;

interface ActivityFields {
  areaId: string;
  categoryId: string | null;
  levelId: string;
  age: number;
  title: string;
  description: string;
  materials: string | null;
  durationMinutes: number;
  minimumPlan: PlanTier;
  baseMarks: number;
  masteryTarget: number;
  skillId: string | null;
  skillStage: 'STARTING' | 'PRACTISING' | 'CONFIDENT';
  status: 'DRAFT' | 'PUBLISHED';
  /** Activity Progression group + difficulty (both null = not grouped). */
  groupId: string | null;
  difficulty: number | null;
  steps: { title: string; description: string }[];
  previews: { imageUrl: string | null; caption: string | null }[];
}
type ActivityPayload = { delete: true } | ({ delete?: false } & ActivityFields);

/** Published state, steps and previews included (in order), for the draft conflict check. */
const snapshot = async (tx: Tx, id: string) => {
  const a = await tx.activity.findUnique({
    where: { id },
    include: { steps: { orderBy: { position: 'asc' } }, previews: { orderBy: { position: 'asc' } } },
  });
  if (!a) return null;
  return {
    id: a.id,
    areaId: a.areaId,
    categoryId: a.categoryId,
    levelId: a.levelId,
    age: a.age,
    title: a.title,
    description: a.description,
    materials: a.materials,
    durationMinutes: a.durationMinutes,
    minimumPlan: a.minimumPlan,
    baseMarks: a.baseMarks,
    masteryTarget: a.masteryTarget,
    skillId: a.skillId,
    skillStage: a.skillStage,
    status: a.status,
    withdrawnAt: a.withdrawnAt,
    groupId: a.familyId,
    difficulty: a.difficultyLevel,
    steps: a.steps.map((s) => ({ title: s.title, description: s.description })),
    previews: a.previews.map((p) => ({ imageUrl: p.imageUrl, caption: p.caption })),
  };
};

/** Anything a child has done with this activity. */
async function hasChildHistory(db: Tx, activityId: string) {
  const [attempts, assignments] = await Promise.all([
    db.activityAttempt.count({ where: { activityId } }),
    db.weeklyAssignment.count({ where: { activityId } }),
  ]);
  return attempts + assignments > 0;
}

/** Every rule the editor's fields must pass. Run on request and again in apply(). Returns the region. */
async function validate(db: Tx, p: ActivityFields, activityId: string | null = null) {
  const area = await currentArea(db, p.areaId).catch(() => {
    throw new BadRequestException('Choose a development area.');
  });

  // Area → Category (optional) → Level, as in part 2.
  const hasCategories = (await db.activityCategory.count({ where: { areaId: area.id, removedAt: null } })) > 0;
  if (hasCategories || p.categoryId) {
    const category = p.categoryId ? await currentCategory(db, p.categoryId).catch(() => null) : null;
    if (!category || category.areaId !== area.id) throw new BadRequestException('Choose a category in this development area.');
  }
  const level = await db.level.findUnique({ where: { id: p.levelId } });
  if (!level || level.areaId !== area.id || level.categoryId !== p.categoryId) {
    throw new BadRequestException('Choose an existing level. Add a level first if none are available.');
  }

  if (!(await db.ageGroup.findUnique({ where: { regionId_age: { regionId: area.regionId, age: p.age } } }))) {
    throw new BadRequestException("Choose an age group. Add it first if it isn't listed.");
  }
  if (p.skillId) {
    const skill = await db.skill.findUnique({ where: { id: p.skillId } });
    if (!skill || skill.areaId !== area.id) throw new BadRequestException('Choose a skill from this development area.');
  }

  // Previews: an uploaded image and / or a caption. External links never reach parents.
  for (const preview of p.previews) {
    if (!preview.imageUrl && !preview.caption) throw new BadRequestException('Add an image or a caption to each preview.');
    if (preview.imageUrl && !(await db.upload.findFirst({ where: { url: preview.imageUrl, kind: 'IMAGE' } }))) {
      throw new BadRequestException('Use an image uploaded with the image picker.');
    }
  }
  // Activity Progression (API_REQUESTS #14): a difficulty matches its group's area, category and
  // age, and its number is unique in the group. It still keeps its area Level (decision 4a).
  if (p.groupId) {
    const group = await db.activityFamily.findUnique({ where: { id: p.groupId } });
    if (!group || group.archived || group.regionId !== area.regionId) throw new BadRequestException('Choose an activity group from this category.');
    if (group.areaId !== p.areaId || group.categoryId !== p.categoryId || group.age !== p.age) {
      throw new BadRequestException("Use the activity group's area, category and age.");
    }
    const clash = p.difficulty
      ? await db.activity.findFirst({ where: { familyId: p.groupId, difficultyLevel: p.difficulty, withdrawnAt: null, ...(activityId ? { id: { not: activityId } } : {}) } })
      : null;
    if (!p.difficulty || clash) throw new BadRequestException('Use a unique positive whole difficulty level for this activity.');
  }
  return area.regionId;
}

const columns = (p: ActivityFields) => ({
  categoryId: p.categoryId,
  levelId: p.levelId,
  age: p.age,
  title: p.title,
  description: p.description,
  materials: p.materials,
  durationMinutes: p.durationMinutes,
  minimumPlan: p.minimumPlan,
  baseMarks: p.baseMarks,
  masteryTarget: p.masteryTarget,
  skillId: p.skillId,
  skillStage: p.skillStage,
  status: p.status,
  familyId: p.groupId,
  difficultyLevel: p.groupId ? p.difficulty : null,
});
const children = (p: ActivityFields) => ({
  steps: { create: p.steps.map((s, position) => ({ position, title: s.title, description: s.description })) },
  previews: { create: p.previews.map((v, position) => ({ position, imageUrl: v.imageUrl, caption: v.caption })) },
});

@Injectable()
export class ActivitiesService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly drafts: DraftsService,
  ) {}

  onModuleInit() {
    this.drafts.register<ActivityPayload>(ACTIVITY_ENTITY, {
      snapshot,
      apply: async (tx, id, payload) => {
        if (payload.delete) {
          const activity = id ? await tx.activity.findUnique({ where: { id } }) : null;
          if (!activity || activity.withdrawnAt) throw new NotFoundException('Activity not found');
          await removeActivity(tx, activity.id);
          return activity.id;
        }

        const regionId = await validate(tx, payload, id);
        if (!id) {
          const created = await tx.activity.create({ data: { regionId, areaId: payload.areaId, ...columns(payload), ...children(payload) } });
          return created.id;
        }

        const existing = await tx.activity.findUnique({ where: { id } });
        if (!existing || existing.withdrawnAt) throw new NotFoundException('Activity not found');
        if (existing.areaId !== payload.areaId) {
          if (await hasChildHistory(tx, id)) throw new BadRequestException("This activity has child records, so its development area can't change.");
        }
        // Mastery is worked out live from the mastery count; lock in earned levels before it moves.
        if (existing.masteryTarget !== payload.masteryTarget || existing.categoryId !== payload.categoryId || existing.levelId !== payload.levelId) {
          await freezeEarnedLevels(tx, existing.areaId);
        }
        await tx.activityStep.deleteMany({ where: { activityId: id } });
        await tx.activityPreview.deleteMany({ where: { activityId: id } });
        await tx.activity.update({ where: { id }, data: { regionId, areaId: payload.areaId, ...columns(payload), ...children(payload) } });
        return id;
      },
    });
  }

  private assertCanManage(admin: SessionAdmin) {
    if (!hasAnySection(admin, ACTIVITY_SECTIONS)) throw new ForbiddenException('You do not have access to this section');
  }

  /** Any signed-in admin. Offered (not withdrawn) activities of a region, with optional filters. */
  async list(q: ActivityQueryDto) {
    await assertRegion(this.prisma, q.regionId);
    const where: Prisma.ActivityWhereInput = {
      regionId: q.regionId,
      withdrawnAt: null,
      ...(q.areaId ? { areaId: q.areaId } : {}),
      ...(q.categoryId ? { categoryId: q.categoryId } : {}),
      ...(q.levelId ? { levelId: q.levelId } : {}),
      ...(q.age !== undefined ? { age: q.age } : {}),
    };
    const activities = await this.prisma.activity.findMany({
      where,
      include: {
        area: { select: { id: true, name: true, position: true } },
        category: { select: { id: true, name: true } },
        level: { select: { id: true, number: true } },
        skill: { select: { id: true, name: true } },
        family: { select: { id: true, name: true } },
        _count: { select: { steps: true, previews: true } },
      },
      orderBy: [{ area: { position: 'asc' } }, { age: 'asc' }, { title: 'asc' }],
    });
    return {
      activities: activities.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        area: { id: a.area.id, name: a.area.name },
        category: a.category,
        level: a.level,
        age: a.age,
        durationMinutes: a.durationMinutes,
        minimumPlan: a.minimumPlan,
        baseMarks: a.baseMarks,
        masteryTarget: a.masteryTarget,
        skill: a.skill,
        skillStage: a.skillStage,
        group: a.family,
        difficulty: a.difficultyLevel,
        status: a.status,
        counts: a._count,
      })),
    };
  }

  /** The full activity for Edit / View. `hasChildRecords` = the area can't be changed. */
  async get(id: string) {
    const a = await this.prisma.activity.findUnique({
      where: { id },
      include: {
        area: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        level: { select: { id: true, number: true, title: true } },
        skill: { select: { id: true, name: true } },
        family: { select: { id: true, name: true } },
        steps: { orderBy: { position: 'asc' } },
        previews: { orderBy: { position: 'asc' } },
      },
    });
    if (!a || a.withdrawnAt) throw new NotFoundException('Activity not found');
    return {
      activity: {
        id: a.id,
        title: a.title,
        description: a.description,
        materials: a.materials,
        area: a.area,
        category: a.category,
        level: a.level,
        age: a.age,
        durationMinutes: a.durationMinutes,
        minimumPlan: a.minimumPlan,
        baseMarks: a.baseMarks,
        masteryTarget: a.masteryTarget,
        skill: a.skill,
        skillStage: a.skillStage,
        group: a.family,
        difficulty: a.difficultyLevel,
        status: a.status,
        steps: a.steps.map((s) => ({ title: s.title, description: s.description })),
        previews: a.previews.map((p) => ({ imageUrl: p.imageUrl, caption: p.caption })),
        hasChildRecords: await hasChildHistory(this.prisma, a.id),
      },
    };
  }

  private fields(dto: ActivityDto): ActivityFields {
    return {
      areaId: dto.areaId,
      categoryId: dto.categoryId ?? null,
      levelId: dto.levelId,
      age: dto.age,
      title: dto.title,
      description: dto.description,
      materials: dto.materials ?? null,
      durationMinutes: dto.durationMinutes,
      minimumPlan: dto.minimumPlan,
      baseMarks: dto.baseMarks,
      masteryTarget: dto.masteryTarget,
      skillId: dto.skillId ?? null,
      skillStage: dto.skillStage,
      status: dto.status,
      groupId: dto.groupId ?? null,
      difficulty: dto.groupId ? (dto.difficulty ?? null) : null,
      steps: dto.steps.map((s) => ({ title: s.title, description: s.description })),
      previews: dto.previews.map((p) => ({ imageUrl: p.imageUrl ?? null, caption: p.caption ?? null })),
    };
  }

  async create(admin: SessionAdmin, dto: ActivityDto) {
    this.assertCanManage(admin);
    const payload = this.fields(dto);
    const regionId = await validate(this.prisma, payload);
    return this.drafts.saveOrDraft<ActivityPayload>({ admin, mode: dto.mode, section: SECTION, entityType: ACTIVITY_ENTITY, entityId: null, regionId, payload, label: dto.title });
  }

  async update(admin: SessionAdmin, id: string, dto: ActivityDto) {
    this.assertCanManage(admin);
    const existing = await this.prisma.activity.findUnique({ where: { id } });
    if (!existing || existing.withdrawnAt) throw new NotFoundException('Activity not found');
    const payload = this.fields(dto);
    if (existing.areaId !== payload.areaId && (await hasChildHistory(this.prisma, id))) {
      throw new BadRequestException("This activity has child records, so its development area can't change.");
    }
    const regionId = await validate(this.prisma, payload, id);
    return this.drafts.saveOrDraft<ActivityPayload>({ admin, mode: dto.mode, section: SECTION, entityType: ACTIVITY_ENTITY, entityId: id, regionId, payload, label: dto.title });
  }

  async remove(admin: SessionAdmin, id: string, dto: DeleteActivityDto) {
    this.assertCanManage(admin);
    const existing = await this.prisma.activity.findUnique({ where: { id } });
    if (!existing || existing.withdrawnAt) throw new NotFoundException('Activity not found');
    return this.drafts.saveOrDraft<ActivityPayload>({ admin, mode: dto.mode, section: SECTION, entityType: ACTIVITY_ENTITY, entityId: id, regionId: existing.regionId, payload: { delete: true }, label: `Removed ${existing.title}` });
  }
}

async function removeActivity(tx: Tx, id: string) {
  if (!(await hasChildHistory(tx, id))) {
    // Nothing a child did points here: delete outright (steps, previews, mandatory picks cascade).
    await tx.countryRestriction.deleteMany({ where: { type: 'ACTIVITY', targetId: id } });
    await tx.activity.delete({ where: { id } });
    return;
  }
  // Withdrawn: no longer offered; history and earned scores remain (guide §13). It no longer
  // counts towards mandatory requirements, so no child is blocked by work they can't do.
  await tx.mandatoryActivity.deleteMany({ where: { activityId: id } });
  await tx.activity.update({ where: { id }, data: { withdrawnAt: new Date(), status: 'WITHDRAWN' } });
}
