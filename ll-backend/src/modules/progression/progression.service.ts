import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { DraftsService, type Tx } from '../drafts/drafts.service';
import { assertRegion } from '../../common/utils/region';
import { EngineError, PLAN_TIERS, countryCheck, simulateWeek, type EngineGroup, type RestrictionType } from '../../common/rules';
import type { SessionAdmin } from '../../common/types/session-admin';
import { listGroups } from '../activity-groups/groups.query';
import { BASES, type ProgressionDto, type WeekPreviewDto } from './dto/progression.dto';

/**
 * Activity Progression settings (Activity Flow §1–19; API_REQUESTS #14): Development Bases 1–3,
 * weekly limit, pending policy, recent / Continue Learning counts, reinforcement, weekly boundary,
 * allocation overrides. One save = one draft = one review. Base changes only affect children's
 * future starting points: a child's current difficulty per group is stored (ChildFamilyStage).
 *
 * OPEN_QUESTIONS Q1: the guide's "+5 capped by an admin maximum" (`maxVisible`, optional) is stored
 * alongside Activity Flow's fixed weekly limit (`weekly`).
 */

export const PROGRESSION_ENTITY = 'ProgressionSettings';
const SECTION = 'Activity Progression';
const DEFAULT_BASES = [
  { name: 'Base 1', from: 0, start: 1 },
  { name: 'Base 2', from: 34, start: 2 },
  { name: 'Base 3', from: 67, start: 3 },
];

interface Override {
  age: string;
  base: string;
  area: string;
  plan: string;
  limit: number;
  start: number;
}
interface ProgressionPayload {
  regionId: string;
  bases: { name: string; from: number; start: number }[];
  weekly: number;
  maxVisible: number | null;
  pendingEnabled: boolean;
  pendingLimit: number;
  pendingDays: number;
  pendingCounts: boolean;
  recent: number;
  continueCount: number;
  reinforcement: 'same' | 'easier';
  resetDay: string;
  overrides: Override[];
}

/** The settings in API shape — schema defaults when the region has none saved yet. */
export async function readSettings(db: Tx, regionId: string) {
  const [s, bases] = await Promise.all([
    db.progressionSettings.findUnique({ where: { regionId } }),
    db.developmentBase.findMany({ where: { regionId }, orderBy: { position: 'asc' } }),
  ]);
  return {
    bases: bases.length === 3 ? bases.map((b) => ({ name: `Base ${b.position}`, from: b.fromPercent, start: b.startDifficulty })) : DEFAULT_BASES,
    weekly: s?.weeklyLimit ?? 20,
    maxVisible: s?.maxVisible ?? null,
    pendingEnabled: s?.pendingEnabled ?? true,
    pendingLimit: s?.pendingLimit ?? 10,
    pendingDays: s?.pendingExpiryDays ?? 28,
    pendingCounts: s?.pendingCountsTowardLimit ?? false,
    recent: s?.recentCount ?? 5,
    continueCount: s?.continueCount ?? 4,
    reinforcement: (s?.reinforcement ?? 'same') as 'same' | 'easier',
    resetDay: s?.resetDay ?? 'anniversary',
    overrides: (Array.isArray(s?.overrides) ? s.overrides : []) as unknown as Override[],
  };
}

/** Bases in order, first from 0, strictly increasing ≤ 100. Overrides valid and unique. */
async function validate(db: Tx, p: ProgressionPayload) {
  await assertRegion(db, p.regionId);
  const names = p.bases.map((b) => b.name);
  if (names.join() !== 'Base 1,Base 2,Base 3') throw new BadRequestException(BASES);
  if (p.bases[0]!.from !== 0 || p.bases.some((b, i) => i > 0 && b.from <= p.bases[i - 1]!.from)) throw new BadRequestException(BASES);

  const [ages, areas] = await Promise.all([
    db.ageGroup.findMany({ where: { regionId: p.regionId }, select: { age: true } }),
    db.developmentArea.findMany({ where: { regionId: p.regionId, removedAt: null }, select: { id: true } }),
  ]);
  const seen = new Set<string>();
  for (const o of p.overrides) {
    const ok =
      (o.age === 'All' || ages.some((a) => String(a.age) === o.age)) &&
      (o.base === 'All' || names.includes(o.base)) &&
      (o.area === 'All' || areas.some((a) => a.id === o.area)) &&
      (o.plan === 'All' || (PLAN_TIERS as readonly string[]).includes(o.plan));
    if (!ok) throw new BadRequestException('Choose an age, Base, area and plan from this category.');
    const key = [o.age, o.base, o.area, o.plan].join('|');
    if (seen.has(key)) throw new BadRequestException('This combination already exists. Edit its row.');
    seen.add(key);
  }
}

@Injectable()
export class ProgressionService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly drafts: DraftsService,
    private readonly audit: AuditService,
  ) {}

  onModuleInit() {
    this.drafts.register<ProgressionPayload>(PROGRESSION_ENTITY, {
      // Keyed by region; a region always has settings (defaults until saved), so drafts can create them.
      snapshot: async (tx, regionId) => {
        const region = await tx.learningRegion.findUnique({ where: { id: regionId }, select: { id: true } });
        return region ? { regionId, ...(await readSettings(tx, regionId)) } : null;
      },
      apply: async (tx, regionId, p) => {
        if (!regionId || regionId !== p.regionId) throw new BadRequestException('Choose a regional learning category.');
        await validate(tx, p);
        const data = {
          weeklyLimit: p.weekly,
          maxVisible: p.maxVisible,
          pendingEnabled: p.pendingEnabled,
          pendingLimit: p.pendingLimit,
          pendingExpiryDays: p.pendingDays,
          pendingCountsTowardLimit: p.pendingCounts,
          recentCount: p.recent,
          continueCount: p.continueCount,
          reinforcement: p.reinforcement,
          resetDay: p.resetDay,
          overrides: p.overrides.map((o) => ({ ...o })),
        };
        await tx.progressionSettings.upsert({ where: { regionId }, update: data, create: { regionId, ...data } });
        for (const [i, b] of p.bases.entries()) {
          const position = i + 1;
          await tx.developmentBase.upsert({
            where: { regionId_position: { regionId, position } },
            update: { name: b.name, fromPercent: b.from, startDifficulty: b.start },
            create: { regionId, position, name: b.name, fromPercent: b.from, startDifficulty: b.start },
          });
        }
        return regionId;
      },
    });
  }

  async get(regionId: string) {
    await assertRegion(this.prisma, regionId);
    return readSettings(this.prisma, regionId);
  }

  async save(admin: SessionAdmin, regionId: string, dto: ProgressionDto) {
    const payload: ProgressionPayload = {
      regionId,
      bases: dto.bases.map((b) => ({ name: b.name, from: b.from, start: b.start })),
      weekly: dto.weekly,
      maxVisible: dto.maxVisible ?? null,
      pendingEnabled: dto.pendingEnabled,
      pendingLimit: dto.pendingLimit,
      pendingDays: dto.pendingDays,
      pendingCounts: dto.pendingCounts,
      recent: dto.recent,
      continueCount: dto.continueCount,
      reinforcement: dto.reinforcement,
      resetDay: dto.resetDay,
      overrides: dto.overrides.map((o) => ({ age: o.age, base: o.base, area: o.area, plan: o.plan, limit: o.limit, start: o.start })),
    };
    await validate(this.prisma, payload);
    const region = await this.prisma.learningRegion.findUniqueOrThrow({ where: { id: regionId } });
    return this.drafts.saveOrDraft<ProgressionPayload>({ admin, mode: dto.mode, section: SECTION, entityType: PROGRESSION_ENTITY, entityId: regionId, regionId, payload, label: `Progression settings for ${region.name}` });
  }

  /**
   * "Preview a child's week" (API_REQUESTS #14): the weekly allocation engine
   * (common/rules/week-engine.ts) on a SAMPLE child, with the region's real settings and groups.
   * Earlier weeks are replayed from the recorded `outcomes`. Never reads or writes a real child.
   */
  async preview(regionId: string, dto: WeekPreviewDto) {
    await assertRegion(this.prisma, regionId);
    if (!(await this.prisma.ageGroup.findUnique({ where: { regionId_age: { regionId, age: dto.age } } }))) {
      throw new BadRequestException("Choose an age group. Add it first if it isn't listed.");
    }
    if (dto.country && !(await this.prisma.country.findUnique({ where: { code: dto.country } }))) throw new BadRequestException('Choose a country.');
    const skillIds = Object.keys(dto.skills);
    const known = await this.prisma.skill.count({ where: { id: { in: skillIds }, area: { regionId } } });
    if (known !== skillIds.length) throw new BadRequestException('Choose skills from this category.');
    if (Object.values(dto.skills).some((v) => v !== null && (typeof v !== 'number' || v < 0 || v > 100))) throw new BadRequestException('Enter skill scores from 0 to 100.');

    const [settings, families, rules] = await Promise.all([
      readSettings(this.prisma, regionId),
      this.prisma.activityFamily.findMany({
        where: { regionId, archived: false, area: { removedAt: null } },
        include: {
          skill: { select: { name: true } },
          activities: { where: { withdrawnAt: null }, include: { level: { select: { number: true } } }, orderBy: { difficultyLevel: 'asc' } },
        },
      }),
      this.prisma.countryRestriction.findMany(),
    ]);
    const countryRules = rules.map((r) => ({ ...r, type: r.type as RestrictionType }));
    const groups: EngineGroup[] = families.map((f) => ({
      id: f.id,
      name: f.name,
      areaId: f.areaId,
      age: f.age,
      skillId: f.skillId,
      skillName: f.skill?.name ?? null,
      benchmark: f.benchmark,
      mandatory: f.mandatory,
      bases: f.baseEligibility,
      difficulties: f.activities
        .filter((a) => a.difficultyLevel !== null)
        .map((a) => ({
          activityId: a.id,
          title: a.title,
          difficulty: a.difficultyLevel!,
          masteryTarget: a.masteryTarget,
          baseMarks: a.baseMarks,
          areaLevel: a.level?.number ?? null,
          minimumPlan: a.minimumPlan,
          published: a.status === 'PUBLISHED',
          // Unknown country → never guessed: country-restricted content isn't offered (guide §20).
          blockedInCountry: countryCheck(countryRules, dto.country ?? null, { type: 'ACTIVITY', targetId: a.id }).status !== 'ALLOWED',
        })),
    }));

    const today = new Date();
    try {
      return simulateWeek({
        settings: { ...settings, bases: settings.bases.map((b) => ({ from: b.from, start: b.start })) },
        groups,
        child: { age: dto.age, plan: dto.plan, questionnaireDone: dto.questionnaire === 'COMPLETED', score: dto.score, level: dto.level, skills: dto.skills },
        week: dto.week,
        outcomes: dto.outcomes.map((o) => ({ assignmentId: o.assignmentId, outcome: o.outcome })),
        cycleStart: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())),
      });
    } catch (e) {
      if (e instanceof EngineError) throw new BadRequestException(e.message);
      throw e;
    }
  }

  /** "Export" (API_REQUESTS #14): settings, grouped activities, areas and the region's countries. */
  async export(admin: SessionAdmin, regionId: string) {
    await assertRegion(this.prisma, regionId);
    const [settings, activities, areas, countries] = await Promise.all([
      readSettings(this.prisma, regionId),
      listGroups(this.prisma, regionId),
      this.prisma.developmentArea.findMany({ where: { regionId, removedAt: null }, select: { id: true, name: true }, orderBy: { position: 'asc' } }),
      this.prisma.country.findMany({ where: { learningRegionId: regionId }, select: { code: true, name: true }, orderBy: { name: 'asc' } }),
    ]);
    await this.audit.write(admin, { action: 'Exported activity progression settings', section: SECTION });
    return { type: 'little-legacy-activity-progression', schemaVersion: 1, regionId, settings, activities, areas, countries };
  }
}
