import { BadRequestException, ConflictException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DraftsService, type Tx } from '../drafts/drafts.service';
import { parseCountryCodes } from '../../common/rules';
import { defaultRules } from '../../common/utils/assessment';
import type { SessionAdmin } from '../../common/types/session-admin';
import type { CreateRegionDto, DeleteRegionDto, UpdateRegionDto } from './dto/region.dto';

/**
 * Regional learning categories (guide §5, CP §1–2; prototype region switcher). Each region has its
 * own complete learning catalogue. Super Admin only for changes (decision 2026-10-06): moving a
 * country changes which catalogue every NEW child there gets. Existing children keep their region.
 *
 * - A country belongs to at most one region. There is no default region (client answer to
 *   OPEN_QUESTIONS Q8, CR2): a country without one has no learning content until an admin assigns it.
 * - `collectDob` (client answer to Q24): when off, parents in this category enter the child's age in
 *   years and months instead of a date of birth. Stored as ChildFieldSetting `DOB`; on by default.
 * - A new region starts empty (no areas, questions, activities) and inactive, with the settings
 *   skeleton the learning engine needs: ages 3–5, Bases 1–3, progression defaults, rules revision 1.
 * - Inactive regions are skipped for new children (resolveRegionForCountry; OPEN_QUESTIONS Q19).
 * - A region can be removed only if no child has ever been assigned to it.
 */

export const REGION_ENTITY = 'LearningRegion';
const SECTION = 'Regional learning categories';

type RegionPayload =
  | { delete: true }
  | { delete?: false; name: string; countryCodes: string[]; active: boolean; collectDob: boolean };
type RegionFields = Exclude<RegionPayload, { delete: true }>;

export const DOB_FIELD = 'DOB';

const snapshot = async (tx: Tx, id: string) => {
  const r = await tx.learningRegion.findUnique({
    where: { id },
    include: { countries: { select: { code: true }, orderBy: { code: 'asc' } }, childFieldSettings: { where: { field: DOB_FIELD } } },
  });
  return r && { id: r.id, name: r.name, active: r.active, collectDob: r.childFieldSettings[0]?.collected ?? true, countryCodes: r.countries.map((c) => c.code) };
};

/** Prototype activity-progression defaults (docs/prototype/activities-assessment.md). */
const SKELETON_AGES = [3, 4, 5];
const SKELETON_BASES = [
  { position: 1, name: 'Base 1', fromPercent: 0, startDifficulty: 1 },
  { position: 2, name: 'Base 2', fromPercent: 34, startDifficulty: 2 },
  { position: 3, name: 'Base 3', fromPercent: 67, startDifficulty: 3 },
];

/**
 * Every rule a save must pass. Run when the request arrives (so the admin sees the problem at once)
 * and again in apply(), because another draft may have changed things before this one is approved.
 */
async function validate(db: Tx, id: string | null, p: RegionFields) {
  const sameName = await db.learningRegion.findFirst({
    where: { name: { equals: p.name, mode: 'insensitive' }, ...(id ? { id: { not: id } } : {}) },
  });
  if (sameName) throw new ConflictException('That category name already exists.');

  const existing = await db.country.findMany({ where: { code: { in: p.countryCodes } }, select: { code: true, learningRegionId: true } });
  const missing = p.countryCodes.filter((c) => !existing.some((e) => e.code === c));
  if (missing.length) throw new BadRequestException(`Add ${missing.join(', ')} as a country first.`);
  if (existing.some((c) => c.learningRegionId && c.learningRegionId !== id)) {
    throw new ConflictException('A country already belongs to another category. Remove it there first.');
  }
}

@Injectable()
export class RegionsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly drafts: DraftsService,
  ) {}

  onModuleInit() {
    this.drafts.register<RegionPayload>(REGION_ENTITY, {
      snapshot,
      apply: async (tx, id, payload) => {
        if (payload.delete) {
          if (!id) throw new BadRequestException('A category id is required.');
          await assertRemovable(tx, id);
          await tx.country.updateMany({ where: { learningRegionId: id }, data: { learningRegionId: null } });
          // Its (unused) catalogue goes with it: areas, activities, settings, the parent checklist… cascade.
          await tx.setting.deleteMany({ where: { key: `checklist.visibleLimit:${id}` } });
          await tx.learningRegion.delete({ where: { id } });
          return id;
        }

        await validate(tx, id, payload);

        const data = { name: payload.name, active: payload.active };
        const regionId = id ? (await tx.learningRegion.update({ where: { id }, data })).id : await createWithSkeleton(tx, data);
        // Older drafts (before Q24) have no collectDob: keep collecting the date of birth.
        const collectDob = payload.collectDob ?? true;
        await tx.childFieldSetting.upsert({
          where: { regionId_field: { regionId, field: DOB_FIELD } },
          update: { collected: collectDob },
          create: { regionId, field: DOB_FIELD, collected: collectDob },
        });

        // Countries taken out have no category until an admin assigns one (no default, CR2);
        // children already there keep theirs.
        await tx.country.updateMany({ where: { learningRegionId: regionId, code: { notIn: payload.countryCodes } }, data: { learningRegionId: null } });
        await tx.country.updateMany({ where: { code: { in: payload.countryCodes } }, data: { learningRegionId: regionId } });
        return regionId;
      },
    });
  }

  /** Any signed-in admin: the region switcher on every Activity Management page needs it. */
  async list() {
    const regions = await this.prisma.learningRegion.findMany({
      include: {
        countries: { select: { code: true, name: true }, orderBy: { code: 'asc' } },
        childFieldSettings: { where: { field: DOB_FIELD } },
        _count: { select: { areas: { where: { removedAt: null } }, activities: { where: { withdrawnAt: null } }, children: true } },
      },
      orderBy: { name: 'asc' },
    });
    return {
      regions: regions.map(({ _count, childFieldSettings, ...r }) => ({
        id: r.id,
        name: r.name,
        active: r.active,
        collectDob: childFieldSettings[0]?.collected ?? true,
        countries: r.countries,
        counts: _count,
      })),
    };
  }

  private codes(input: string[]) {
    const { codes, invalid } = parseCountryCodes(input);
    if (invalid.length) throw new BadRequestException('Use two-letter country codes.');
    return codes;
  }

  async create(admin: SessionAdmin, dto: CreateRegionDto) {
    const payload: RegionFields = { name: dto.name, countryCodes: this.codes(dto.countryCodes), active: dto.active, collectDob: dto.collectDob };
    await validate(this.prisma, null, payload);
    return this.drafts.saveOrDraft<RegionPayload>({ admin, mode: dto.mode, section: SECTION, entityType: REGION_ENTITY, entityId: null, payload, label: payload.name });
  }

  async update(admin: SessionAdmin, id: string, dto: UpdateRegionDto) {
    const current = await snapshot(this.prisma, id);
    if (!current) throw new NotFoundException('Category not found');
    const payload: RegionFields = {
      name: dto.name ?? current.name,
      countryCodes: dto.countryCodes ? this.codes(dto.countryCodes) : current.countryCodes,
      active: dto.active ?? current.active,
      collectDob: dto.collectDob ?? current.collectDob,
    };
    await validate(this.prisma, id, payload);
    return this.drafts.saveOrDraft<RegionPayload>({ admin, mode: dto.mode, section: SECTION, entityType: REGION_ENTITY, entityId: id, regionId: id, payload, label: payload.name });
  }

  async remove(admin: SessionAdmin, id: string, dto: DeleteRegionDto) {
    const current = await snapshot(this.prisma, id);
    if (!current) throw new NotFoundException('Category not found');
    await assertRemovable(this.prisma, id);
    return this.drafts.saveOrDraft<RegionPayload>({ admin, mode: dto.mode, section: SECTION, entityType: REGION_ENTITY, entityId: id, regionId: id, payload: { delete: true }, label: `Removed ${current.name}` });
  }
}

/** A child's region is fixed and their records point at its catalogue, so it can never be removed. */
async function assertRemovable(db: Tx, id: string) {
  const region = await db.learningRegion.findUnique({ where: { id }, select: { _count: { select: { children: true } } } });
  if (!region) throw new NotFoundException('Category not found');
  if (region._count.children > 0) throw new BadRequestException("Children already use this category, so it can't be removed. Deactivate it instead.");
}

/** New region + the settings the learning engine needs. No areas, questions or activities. */
async function createWithSkeleton(tx: Tx, data: { name: string; active: boolean }) {
  const region = await tx.learningRegion.create({ data });
  await tx.ageGroup.createMany({ data: SKELETON_AGES.map((age) => ({ regionId: region.id, age })) });
  await tx.developmentBase.createMany({ data: SKELETON_BASES.map((b) => ({ regionId: region.id, ...b })) });
  await tx.progressionSettings.create({ data: { regionId: region.id } });
  await tx.assessmentConfig.create({ data: { regionId: region.id, revision: 1, rules: defaultRules([]) } });
  return region.id;
}
