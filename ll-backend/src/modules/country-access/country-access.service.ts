import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import type { RestrictionType as PrismaRestrictionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DraftsService, type Tx } from '../drafts/drafts.service';
import { countryCheck, RESTRICTION_TYPE_KEYS, RESTRICTION_TYPES, type RestrictionType } from '../../common/rules';
import { isSuperAdmin, type SessionAdmin } from '../../common/types/session-admin';
import type { DeleteRestrictionDto, RestrictionDto } from './dto/restriction.dto';

/**
 * Country access (guide §20, CP §3–5; prototype country-access.js). Opened from a button inside
 * each relevant page — there is no nav section. A restriction decides whether a section or item is
 * available in a country at all; plan and learning gates still apply on top (canAccess).
 */

export const RESTRICTION_ENTITY = 'CountryRestriction';
const SECTION = 'Country access';

type Payload =
  | { delete: true }
  | { delete?: false; countryCode: string; type: RestrictionType; targetId: string | null; message: string; enabled: boolean };

const snapshot = (tx: Tx, id: string) =>
  tx.countryRestriction.findUnique({
    where: { id },
    select: { id: true, countryCode: true, type: true, targetId: true, message: true, enabled: true },
  });

@Injectable()
export class CountryAccessService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly drafts: DraftsService,
  ) {}

  onModuleInit() {
    this.drafts.register<Payload>(RESTRICTION_ENTITY, {
      snapshot,
      apply: async (tx, id, payload) => {
        if (payload.delete) {
          if (!id) throw new BadRequestException('A restriction id is required.');
          await tx.countryRestriction.delete({ where: { id } });
          return id;
        }
        const data = {
          countryCode: payload.countryCode,
          type: payload.type as PrismaRestrictionType,
          targetId: payload.targetId,
          message: payload.message,
          enabled: payload.enabled,
        };
        if (id) {
          await tx.countryRestriction.update({ where: { id }, data });
          return id;
        }
        return (await tx.countryRestriction.create({ data })).id;
      },
    });
  }

  /** Types this admin may manage: Super Admin all; otherwise those whose section they hold. */
  private manageable(admin: SessionAdmin, requested?: RestrictionType[]) {
    const wanted = requested?.length ? requested : RESTRICTION_TYPE_KEYS;
    return wanted.filter((t) => isSuperAdmin(admin) || admin.permissions.includes(RESTRICTION_TYPES[t].section));
  }

  private assertCanManage(admin: SessionAdmin, type: RestrictionType) {
    if (!this.manageable(admin, [type]).length) throw new ForbiddenException('You do not have access to this section');
  }

  /** Targets per type: "Entire section" for section types; activities / levels for item types. */
  async targets(type: RestrictionType): Promise<{ id: string | null; name: string }[]> {
    if (RESTRICTION_TYPES[type].scope === 'section') return [{ id: null, name: 'Entire section' }];
    if (type === 'ACTIVITY') {
      const activities = await this.prisma.activity.findMany({
        where: { withdrawnAt: null },
        select: { id: true, title: true, area: { select: { name: true } } },
        orderBy: [{ area: { position: 'asc' } }, { title: 'asc' }],
      });
      return activities.map((a) => ({ id: a.id, name: `${a.area.name} · ${a.title}` }));
    }
    const levels = await this.prisma.level.findMany({
      where: { area: { removedAt: null }, OR: [{ categoryId: null }, { category: { removedAt: null } }] },
      select: { id: true, number: true, area: { select: { name: true } }, category: { select: { name: true } } },
      orderBy: [{ area: { position: 'asc' } }, { number: 'asc' }],
    });
    return levels.map((l) => ({ id: l.id, name: [l.area.name, l.category?.name, `Level ${l.number}`].filter(Boolean).join(' · ') }));
  }

  async list(admin: SessionAdmin, types?: RestrictionType[]) {
    const allowed = this.manageable(admin, types);
    const [countries, rules] = await Promise.all([
      this.prisma.country.findMany({ select: { code: true, name: true, enabled: true }, orderBy: { name: 'asc' } }),
      this.prisma.countryRestriction.findMany({
        where: { type: { in: allowed as PrismaRestrictionType[] } },
        include: { country: { select: { name: true } } },
        orderBy: [{ countryCode: 'asc' }, { type: 'asc' }],
      }),
    ]);
    const targetsByType = Object.fromEntries(await Promise.all(allowed.map(async (t) => [t, await this.targets(t)] as const)));
    return {
      countries,
      types: allowed.map((t) => ({ type: t, label: RESTRICTION_TYPES[t].label, targets: targetsByType[t] ?? [] })),
      restrictions: rules.map((r) => ({
        id: r.id,
        countryCode: r.countryCode,
        countryName: r.country.name,
        type: r.type,
        targetId: r.targetId,
        targetName: targetsByType[r.type]?.find((x) => x.id === r.targetId)?.name ?? 'Removed target',
        message: r.message,
        enabled: r.enabled,
      })),
    };
  }

  private async validate(dto: RestrictionDto, excludeId?: string) {
    const country = await this.prisma.country.findUnique({ where: { code: dto.countryCode } });
    const targetId = RESTRICTION_TYPES[dto.type].scope === 'section' ? null : (dto.targetId ?? null);
    const targets = await this.targets(dto.type);
    if (!country || !targets.some((t) => t.id === targetId)) throw new BadRequestException('Choose a valid country, target and message.');
    // (country, type, target) is unique. Checked here because PostgreSQL treats NULL targets as distinct.
    const duplicate = await this.prisma.countryRestriction.findFirst({
      where: { countryCode: dto.countryCode, type: dto.type as PrismaRestrictionType, targetId, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });
    if (duplicate) throw new ConflictException('A rule already exists for that country and target. Edit it instead.');
    return { countryCode: dto.countryCode, type: dto.type, targetId, message: dto.message, enabled: dto.enabled };
  }

  async create(admin: SessionAdmin, dto: RestrictionDto) {
    this.assertCanManage(admin, dto.type);
    const payload = await this.validate(dto);
    return this.drafts.saveOrDraft({
      admin,
      mode: dto.mode,
      section: SECTION,
      entityType: RESTRICTION_ENTITY,
      entityId: null,
      payload,
      label: `${RESTRICTION_TYPES[dto.type].label} restriction for ${dto.countryCode}`,
    });
  }

  async update(admin: SessionAdmin, id: string, dto: RestrictionDto) {
    const existing = await this.prisma.countryRestriction.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Restriction not found');
    this.assertCanManage(admin, existing.type as RestrictionType);
    this.assertCanManage(admin, dto.type);
    const payload = await this.validate(dto, id);
    return this.drafts.saveOrDraft({
      admin,
      mode: dto.mode,
      section: SECTION,
      entityType: RESTRICTION_ENTITY,
      entityId: id,
      payload,
      label: `${RESTRICTION_TYPES[dto.type].label} restriction for ${dto.countryCode}`,
    });
  }

  async remove(admin: SessionAdmin, id: string, dto: DeleteRestrictionDto) {
    const existing = await this.prisma.countryRestriction.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Restriction not found');
    this.assertCanManage(admin, existing.type as RestrictionType);
    return this.drafts.saveOrDraft({
      admin,
      mode: dto.mode,
      section: SECTION,
      entityType: RESTRICTION_ENTITY,
      entityId: id,
      payload: { delete: true as const },
      label: `Removed ${RESTRICTION_TYPES[existing.type as RestrictionType].label} restriction for ${existing.countryCode}`,
    });
  }

  /** What a parent in `countryCode` would see, per section and per activity. Country rules only. */
  async preview(countryCode: string | null) {
    const [rules, activities] = await Promise.all([
      this.prisma.countryRestriction.findMany(),
      this.targets('ACTIVITY'),
    ]);
    const ruleSet = rules.map((r) => ({ ...r, type: r.type as RestrictionType }));
    const sectionTypes = RESTRICTION_TYPE_KEYS.filter((t) => RESTRICTION_TYPES[t].scope === 'section');
    const row = (label: string, type: RestrictionType, targetId: string | null) => {
      const check = countryCheck(ruleSet, countryCode, { type, targetId });
      return {
        label,
        check: { COUNTRY_REQUIRED: 'Country required', BLOCKED: 'Blocked', ALLOWED: 'No country restriction' }[check.status],
        reason: check.status === 'BLOCKED' ? check.message : '',
      };
    };
    return {
      rows: [
        ...sectionTypes.map((t) => row(RESTRICTION_TYPES[t].label, t, null)),
        ...activities.map((a) => row(a.name, 'ACTIVITY', a.id)),
      ],
    };
  }

  async exportRules(admin: SessionAdmin) {
    const [countries, rules] = await Promise.all([
      this.prisma.country.findMany({ select: { code: true, name: true } }),
      this.prisma.countryRestriction.findMany({ where: { type: { in: this.manageable(admin) as PrismaRestrictionType[] } } }),
    ]);
    return {
      type: 'little-legacy-country-access',
      schemaVersion: 2,
      countries,
      rules,
      precedence: 'any-enabled-block-wins',
      missingCountry: 'country-required',
    };
  }
}
