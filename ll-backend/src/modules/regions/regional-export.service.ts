import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { SessionAdmin } from '../../common/types/session-admin';
import { readSettings } from '../progression/progression.service';
import { listGroups } from '../activity-groups/groups.query';

/**
 * "Export regional learning" on the Regional learning categories card (API_REQUESTS #10): each
 * category's countries and its whole learning setup in one JSON file. Download only; nothing imports it.
 *
 * Decisions 2026-10-16:
 * 1. Live setup only (no pending drafts); removed areas / categories and withdrawn activities left out.
 *    Stories, rhymes, plans and the parent checklist aren't regional learning, so they're not here.
 * 2. Admin-only numbers (question marks and difficulty, weights) are included: the file is for staff.
 * 3. Super Admin only, like the header exports.
 * 4. Every category, or one with `?regionId=`.
 */
@Injectable()
export class RegionalExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async export(admin: SessionAdmin, regionId?: string) {
    if (regionId && !(await this.prisma.learningRegion.count({ where: { id: regionId } }))) {
      throw new BadRequestException('Choose a regional learning category.');
    }
    const regions = await this.prisma.learningRegion.findMany({
      where: regionId ? { id: regionId } : {},
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      include: { countries: { select: { code: true, name: true }, orderBy: { name: 'asc' } } },
    });

    const catalogues: Record<string, Awaited<ReturnType<RegionalExportService['catalogue']>>> = {};
    for (const r of regions) catalogues[r.id] = await this.catalogue(r.id);

    await this.audit.write(admin, {
      action: regionId ? `Exported regional learning: ${regions[0]!.name}` : 'Exported regional learning',
      section: 'Regional learning categories',
    });
    return {
      type: 'little-legacy-regional-learning',
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      regions: regions.map((r) => ({ id: r.id, name: r.name, isDefault: r.isDefault, active: r.active, countries: r.countries })),
      catalogues,
    };
  }

  /** One category's live learning setup. */
  private async catalogue(regionId: string) {
    const liveArea = { regionId, removedAt: null };
    const [ageGroups, areas, activities, assessment, mandatory, progression, activityGroups] = await Promise.all([
      this.prisma.ageGroup.findMany({ where: { regionId }, orderBy: { age: 'asc' }, select: { age: true } }),
      this.prisma.developmentArea.findMany({
        where: liveArea,
        orderBy: { position: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          position: true,
          categories: { where: { removedAt: null }, orderBy: { name: 'asc' }, select: { id: true, name: true, description: true } },
          levels: {
            where: { OR: [{ categoryId: null }, { category: { removedAt: null } }] },
            orderBy: [{ categoryId: 'asc' }, { number: 'asc' }],
            select: { id: true, categoryId: true, number: true, title: true, icon: true, iconColor: true, requiredScore: true, requiredMastered: true },
          },
          questions: {
            orderBy: [{ age: 'asc' }, { position: 'asc' }],
            select: {
              id: true,
              age: true,
              text: true,
              difficulty: true,
              position: true,
              skillId: true,
              options: { orderBy: { position: 'asc' }, select: { id: true, label: true, marks: true, position: true, skillStage: true } },
            },
          },
          skills: { orderBy: { name: 'asc' }, select: { id: true, name: true, expectations: { orderBy: { age: 'asc' }, select: { age: true, expectedScore: true } } } },
        },
      }),
      this.prisma.activity.findMany({
        where: { regionId, withdrawnAt: null, area: { removedAt: null } },
        orderBy: [{ area: { position: 'asc' } }, { age: 'asc' }, { title: 'asc' }],
        include: { steps: { orderBy: { position: 'asc' } }, previews: { orderBy: { position: 'asc' } } },
      }),
      this.prisma.assessmentConfig.findFirst({ where: { regionId }, orderBy: { revision: 'desc' } }),
      this.prisma.mandatoryActivity.findMany({
        where: { regionId, area: { removedAt: null }, activity: { withdrawnAt: null } },
        orderBy: [{ age: 'asc' }, { areaId: 'asc' }],
        select: { age: true, areaId: true, activityId: true },
      }),
      readSettings(this.prisma, regionId),
      listGroups(this.prisma, regionId),
    ]);

    return {
      ageGroups: ageGroups.map((g) => g.age),
      areas: areas.map((a) => ({
        ...a,
        // Decimal → "2.00", as everywhere else in the API.
        questions: a.questions.map((q) => ({ ...q, options: q.options.map((o) => ({ ...o, marks: o.marks.toFixed(2) })) })),
      })),
      activities: activities.map(({ regionId: _regionId, ...a }) => a),
      assessmentRules: assessment ? { revision: assessment.revision, rules: assessment.rules, createdAt: assessment.createdAt } : null,
      mandatory,
      progression,
      activityGroups,
    };
  }
}
