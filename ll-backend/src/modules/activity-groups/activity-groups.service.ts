import { BadRequestException, ConflictException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DraftsService, type Tx } from '../drafts/drafts.service';
import { assertRegion, currentArea, currentCategory } from '../../common/utils/region';
import type { SessionAdmin } from '../../common/types/session-admin';
import { basePosition, listGroups } from './groups.query';
import type { ActivityGroupDto, GroupModeDto, LinkActivityDto } from './dto/activity-group.dto';

/**
 * Activity groups (Activity Flow §5–6, §18; API_REQUESTS #14): one activity with its OWN
 * difficulty levels (Level 1…N, not capped at 7). The difficulties are ordinary activities with
 * `familyId` + `difficultyLevel`, edited through the activity editor (#7) — each still keeps an
 * area Level, so it passes the same gates as any activity (decision 2026-10-13, option a).
 *
 * - Age must be an existing age group (decision 3; not added automatically).
 * - Saving carries the group's age and skill over to its difficulties. Its area / category can only
 *   change while it has no difficulties (their Level must stay on the area's / category's ladder).
 * - Archive: out of future weeks; history and earned scores stay. Link: an ungrouped activity with
 *   the same area, category and age becomes a difficulty (its level number by default).
 */

export const GROUP_ENTITY = 'ActivityFamily';
export const GROUP_LINK_ENTITY = 'ActivityFamilyLink';
const SECTION = 'Activity Progression';

interface GroupFields {
  areaId: string;
  categoryId: string | null;
  age: number;
  name: string;
  skillId: string | null;
  benchmark: number;
  mandatory: boolean;
  baseEligibility: number[];
}
type GroupPayload = { archive: true } | ({ archive?: false } & GroupFields);

const snapshot = (tx: Tx, id: string) =>
  tx.activityFamily.findUnique({
    where: { id },
    select: { id: true, regionId: true, areaId: true, categoryId: true, age: true, name: true, skillId: true, benchmark: true, mandatory: true, baseEligibility: true, archived: true },
  });

/** The group plus its difficulties (for the link draft's conflict check). */
const linkSnapshot = async (tx: Tx, id: string) => {
  const g = await tx.activityFamily.findUnique({ where: { id }, include: { activities: { select: { id: true, difficultyLevel: true }, orderBy: { id: 'asc' } } } });
  return g && { id: g.id, archived: g.archived, difficulties: g.activities.map((a) => ({ id: a.id, level: a.difficultyLevel })) };
};

async function validate(db: Tx, p: GroupFields, id: string | null) {
  const area = await currentArea(db, p.areaId).catch(() => {
    throw new BadRequestException('Choose a development area.');
  });
  if (!(await db.ageGroup.findUnique({ where: { regionId_age: { regionId: area.regionId, age: p.age } } }))) {
    throw new BadRequestException("Choose an age group. Add it first if it isn't listed.");
  }
  // Area → Category (optional), as everywhere in Activity Management. #14 message.
  const hasCategories = (await db.activityCategory.count({ where: { areaId: area.id, removedAt: null } })) > 0;
  if (hasCategories || p.categoryId) {
    const category = p.categoryId ? await currentCategory(db, p.categoryId).catch(() => null) : null;
    if (!category || category.areaId !== area.id) throw new BadRequestException('Choose a category in this area.');
  }
  if (p.skillId) {
    const skill = await db.skill.findUnique({ where: { id: p.skillId } });
    if (!skill || skill.areaId !== area.id) throw new BadRequestException('Choose a skill from this development area.');
  }
  const taken = await db.activityFamily.findFirst({
    where: { areaId: p.areaId, age: p.age, name: { equals: p.name, mode: 'insensitive' }, ...(id ? { id: { not: id } } : {}) },
  });
  if (taken) throw new ConflictException('This activity already exists for this area and age.');

  if (id) {
    const existing = await db.activityFamily.findUnique({ where: { id }, include: { _count: { select: { activities: { where: { withdrawnAt: null } } } } } });
    if (!existing) throw new NotFoundException('Activity group not found');
    if ((existing.areaId !== p.areaId || existing.categoryId !== p.categoryId) && existing._count.activities > 0) {
      throw new BadRequestException("Move or remove this group's difficulty levels before changing its area or category.");
    }
  }
  return area;
}

@Injectable()
export class ActivityGroupsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly drafts: DraftsService,
  ) {}

  onModuleInit() {
    this.drafts.register<GroupPayload>(GROUP_ENTITY, {
      snapshot,
      apply: async (tx, id, payload) => {
        if (payload.archive) {
          const group = id ? await tx.activityFamily.findUnique({ where: { id } }) : null;
          if (!group) throw new NotFoundException('Activity group not found');
          await tx.activityFamily.update({ where: { id: group.id }, data: { archived: true } });
          return group.id;
        }
        const area = await validate(tx, payload, id);
        const data = { ...payload, regionId: area.regionId };
        if (!id) return (await tx.activityFamily.create({ data })).id;
        await tx.activityFamily.update({ where: { id }, data });
        // "Saving a group also moves its levels to its age … and skill" (#14).
        await tx.activity.updateMany({ where: { familyId: id }, data: { age: payload.age, skillId: payload.skillId } });
        return id;
      },
    });

    this.drafts.register<{ activityId: string }>(GROUP_LINK_ENTITY, {
      snapshot: linkSnapshot,
      apply: async (tx, groupId, { activityId }) => {
        if (!groupId) throw new NotFoundException('Activity group not found');
        const level = await this.assertLinkable(tx, groupId, activityId);
        await tx.activity.update({ where: { id: activityId }, data: { familyId: groupId, difficultyLevel: level } });
        return groupId;
      },
    });
  }

  /** The activity can join the group; returns its difficulty (its Level number). */
  private async assertLinkable(db: Tx, groupId: string, activityId: string) {
    const group = await db.activityFamily.findUnique({ where: { id: groupId } });
    if (!group || group.archived) throw new NotFoundException('Activity group not found');
    const activity = await db.activity.findUnique({ where: { id: activityId }, include: { level: true } });
    if (
      !activity || activity.withdrawnAt || activity.familyId ||
      activity.areaId !== group.areaId || activity.age !== group.age || activity.categoryId !== group.categoryId
    ) {
      throw new BadRequestException('Choose an ungrouped activity with the same area, category and age.');
    }
    const level = activity.level?.number ?? 1;
    if (await db.activity.findFirst({ where: { familyId: groupId, difficultyLevel: level } })) {
      throw new ConflictException('This difficulty number already exists in the group.');
    }
    return level;
  }

  async list(regionId: string) {
    await assertRegion(this.prisma, regionId);
    return { rows: await listGroups(this.prisma, regionId) };
  }

  private fields(dto: ActivityGroupDto): GroupFields {
    return {
      areaId: dto.areaId,
      categoryId: dto.categoryId ?? null,
      age: dto.age,
      name: dto.name,
      skillId: dto.skillId ?? null,
      benchmark: dto.benchmark,
      mandatory: dto.mandatory,
      baseEligibility: [...new Set(dto.bases.map(basePosition))].sort(),
    };
  }

  async create(admin: SessionAdmin, dto: ActivityGroupDto) {
    const payload = this.fields(dto);
    const area = await validate(this.prisma, payload, null);
    return this.drafts.saveOrDraft<GroupPayload>({ admin, mode: dto.mode, section: SECTION, entityType: GROUP_ENTITY, entityId: null, regionId: area.regionId, payload, label: `${area.name} · ${dto.name}` });
  }

  async update(admin: SessionAdmin, id: string, dto: ActivityGroupDto) {
    const existing = await this.prisma.activityFamily.findUnique({ where: { id } });
    if (!existing || existing.archived) throw new NotFoundException('Activity group not found');
    const payload = this.fields(dto);
    const area = await validate(this.prisma, payload, id);
    return this.drafts.saveOrDraft<GroupPayload>({ admin, mode: dto.mode, section: SECTION, entityType: GROUP_ENTITY, entityId: id, regionId: area.regionId, payload, label: `${area.name} · ${dto.name}` });
  }

  async archive(admin: SessionAdmin, id: string, dto: GroupModeDto) {
    const existing = await this.prisma.activityFamily.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Activity group not found');
    if (existing.archived) throw new BadRequestException('This activity group is already archived.');
    return this.drafts.saveOrDraft<GroupPayload>({ admin, mode: dto.mode, section: SECTION, entityType: GROUP_ENTITY, entityId: id, regionId: existing.regionId, payload: { archive: true }, label: `Archived ${existing.name}` });
  }

  async link(admin: SessionAdmin, id: string, dto: LinkActivityDto) {
    await this.assertLinkable(this.prisma, id, dto.activityId);
    const group = await this.prisma.activityFamily.findUniqueOrThrow({ where: { id } });
    return this.drafts.saveOrDraft<{ activityId: string }>({ admin, mode: dto.mode, section: SECTION, entityType: GROUP_LINK_ENTITY, entityId: id, regionId: group.regionId, payload: { activityId: dto.activityId }, label: `Linked content to ${group.name}` });
  }
}
