import { ConflictException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DraftsService, type Tx } from '../drafts/drafts.service';
import { assertRegion } from '../../common/utils/region';
import type { SessionAdmin } from '../../common/types/session-admin';
import type { CreateAreaDto, DeleteAreaDto, UpdateAreaDto } from './dto/area.dto';

/**
 * Development areas (guide §5–6; prototype Activity Management hub). Per regional learning
 * category: editing one region never touches another.
 *
 * Delete (decision 2026-10-08, option B): "questions, levels and activities are removed, but review
 * history and child records remain".
 *  - No child history in the area → deleted outright, with its whole catalogue.
 *  - Child history → soft-removed (`removedAt`): hidden everywhere, with everything in it.
 *    Activities are withdrawn (history and earned scores kept, guide §13); questions, skills and
 *    mandatory picks are deleted; activity groups are archived (children's difficulty stages are
 *    child records). Levels and categories are KEPT, hidden with the area: a child's level is
 *    worked out from those thresholds, and deleting them would lower levels already earned.
 * Questionnaire answers are stored as copies on each submission, so deleting questions never
 * changes what a child earned. Assessment-rule revisions are snapshots and stay untouched.
 */

export const AREA_ENTITY = 'DevelopmentArea';
const SECTION = 'Developmental Milestones';

type AreaPayload =
  | { delete: true }
  | { delete?: false; regionId: string; name: string; description: string | null };
type AreaFields = Exclude<AreaPayload, { delete: true }>;

const snapshot = (tx: Tx, id: string) =>
  tx.developmentArea.findUnique({ where: { id }, select: { id: true, regionId: true, name: true, description: true, position: true, removedAt: true } });

/** Unique per region among current areas, ignoring case. Checked on request and again in apply(). */
async function assertNameFree(db: Tx, regionId: string, name: string, excludeId: string | null) {
  const taken = await db.developmentArea.findFirst({
    where: { regionId, removedAt: null, name: { equals: name, mode: 'insensitive' }, ...(excludeId ? { id: { not: excludeId } } : {}) },
  });
  if (taken) throw new ConflictException('That development area already exists in this category.');
}

/** Anything a child has done in this area: attempts, weekly assignments, difficulty stages, earned levels. */
async function hasChildHistory(db: Tx, areaId: string) {
  const counts = await Promise.all([
    db.activityAttempt.count({ where: { activity: { areaId } } }),
    db.weeklyAssignment.count({ where: { activity: { areaId } } }),
    db.childFamilyStage.count({ where: { family: { areaId } } }),
    db.childAreaLevel.count({ where: { areaId } }),
  ]);
  return counts.some((n) => n > 0);
}

@Injectable()
export class AreasService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly drafts: DraftsService,
  ) {}

  onModuleInit() {
    this.drafts.register<AreaPayload>(AREA_ENTITY, {
      snapshot,
      apply: async (tx, id, payload) => {
        if (payload.delete) {
          const area = id ? await tx.developmentArea.findUnique({ where: { id } }) : null;
          if (!area || area.removedAt) throw new NotFoundException('Development area not found');
          await removeArea(tx, area.id);
          return area.id;
        }

        await assertRegion(tx, payload.regionId);
        await assertNameFree(tx, payload.regionId, payload.name, id);
        if (id) {
          await tx.developmentArea.update({ where: { id }, data: { name: payload.name, description: payload.description } });
          return id;
        }
        const last = await tx.developmentArea.aggregate({ where: { regionId: payload.regionId }, _max: { position: true } });
        const created = await tx.developmentArea.create({
          data: { regionId: payload.regionId, name: payload.name, description: payload.description, position: (last._max.position ?? -1) + 1 },
        });
        return created.id;
      },
    });
  }

  /** Any signed-in admin: every Activity Management page and several filters need the list. */
  async list(regionId: string) {
    await assertRegion(this.prisma, regionId);
    const areas = await this.prisma.developmentArea.findMany({
      where: { regionId, removedAt: null },
      include: {
        _count: {
          select: {
            questions: true,
            categories: { where: { removedAt: null } },
            levels: { where: { OR: [{ categoryId: null }, { category: { removedAt: null } }] } },
            activities: { where: { withdrawnAt: null } },
          },
        },
      },
      orderBy: { position: 'asc' },
    });
    return {
      areas: areas.map(({ _count, ...a }) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        position: a.position,
        counts: _count,
      })),
    };
  }

  /** A current (not removed) area, or 404. */
  private async current(id: string) {
    const area = await this.prisma.developmentArea.findUnique({ where: { id } });
    if (!area || area.removedAt) throw new NotFoundException('Development area not found');
    return area;
  }

  async create(admin: SessionAdmin, dto: CreateAreaDto) {
    await assertRegion(this.prisma, dto.regionId);
    await assertNameFree(this.prisma, dto.regionId, dto.name, null);
    const payload: AreaFields = { regionId: dto.regionId, name: dto.name, description: dto.description };
    return this.drafts.saveOrDraft<AreaPayload>({ admin, mode: dto.mode, section: SECTION, entityType: AREA_ENTITY, entityId: null, regionId: dto.regionId, payload, label: dto.name });
  }

  async update(admin: SessionAdmin, id: string, dto: UpdateAreaDto) {
    const area = await this.current(id);
    const payload: AreaFields = {
      regionId: area.regionId,
      name: dto.name ?? area.name,
      description: dto.description !== undefined ? dto.description : area.description,
    };
    await assertNameFree(this.prisma, area.regionId, payload.name, id);
    return this.drafts.saveOrDraft<AreaPayload>({ admin, mode: dto.mode, section: SECTION, entityType: AREA_ENTITY, entityId: id, regionId: area.regionId, payload, label: payload.name });
  }

  async remove(admin: SessionAdmin, id: string, dto: DeleteAreaDto) {
    const area = await this.current(id);
    return this.drafts.saveOrDraft<AreaPayload>({ admin, mode: dto.mode, section: SECTION, entityType: AREA_ENTITY, entityId: id, regionId: area.regionId, payload: { delete: true }, label: `Removed ${area.name}` });
  }
}

async function removeArea(tx: Tx, areaId: string) {
  if (!(await hasChildHistory(tx, areaId))) {
    // Nothing a child did points here: delete outright. Activities first (their area link has no
    // cascade); the area's categories, levels, questions, skills, groups and picks cascade.
    await tx.activity.deleteMany({ where: { areaId } });
    await tx.developmentArea.delete({ where: { id: areaId } });
    return;
  }
  const now = new Date();
  await tx.activity.updateMany({ where: { areaId, withdrawnAt: null }, data: { withdrawnAt: now, status: 'WITHDRAWN' } });
  // Withdrawn work no longer counts towards mandatory requirements (guide §13).
  await tx.mandatoryActivity.deleteMany({ where: { areaId } });
  await tx.question.deleteMany({ where: { areaId } });
  await tx.skill.deleteMany({ where: { areaId } });
  // Levels and categories stay (hidden with the area): earned levels are computed from them.
  await tx.activityFamily.updateMany({ where: { areaId }, data: { archived: true } });
  await tx.developmentArea.update({ where: { id: areaId }, data: { removedAt: now } });
}
