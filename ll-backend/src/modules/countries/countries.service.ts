import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DraftsService, type Tx } from '../drafts/drafts.service';
import { isCountryCode, isCurrencyCode } from '../../common/rules';
import { hasAnySection, type SessionAdmin } from '../../common/types/session-admin';
import type { CreateCountryDto, UpdateCountryDto } from './dto/country.dto';

/**
 * Countries (guide §20; prototype Plans & Commerce "Add country", Shop "Countries & Delivery").
 * One country list shared by subscriptions, the shop and country access. Prices are entered per
 * country by hand and never converted, so a new country starts with no prices (= unavailable).
 *
 * Code and currency are fixed once created. There is no delete: parents, orders and prices refer
 * to countries, so a country is switched off with `enabled` (Availability) instead.
 * Learning-region membership is managed from the region editor (modules/regions), not here.
 */

export const COUNTRY_ENTITY = 'Country';
const SECTION = 'Countries';
/** Both pages that show the country list may manage it (decision 2026-10-06). */
export const COUNTRY_SECTIONS = ['subscriptions', 'shopOrders'] as const;
const PRICES_MISSING = 'Product and subscription prices are missing; configure them before purchase.';

interface CountryPayload {
  code: string;
  name: string;
  currency: string;
  deliveryCharge: number;
  deliveryEstimate: string | null;
  enabled: boolean;
}

const snapshot = async (tx: Tx, code: string) => {
  const c = await tx.country.findUnique({ where: { code } });
  return c && { code: c.code, name: c.name, currency: c.currency, deliveryCharge: Number(c.deliveryCharge), deliveryEstimate: c.deliveryEstimate, enabled: c.enabled };
};

@Injectable()
export class CountriesService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly drafts: DraftsService,
  ) {}

  onModuleInit() {
    this.drafts.register<CountryPayload>(COUNTRY_ENTITY, {
      snapshot,
      apply: async (tx, code, p) => {
        if (code) {
          // Code and currency never change, even if a stored draft says otherwise.
          await tx.country.update({ where: { code }, data: { name: p.name, deliveryCharge: p.deliveryCharge, deliveryEstimate: p.deliveryEstimate, enabled: p.enabled } });
          return code;
        }
        // Re-checked here: another draft may have added the same country since this one was saved.
        if (await tx.country.findUnique({ where: { code: p.code } })) throw new ConflictException('That country already exists.');
        await tx.country.create({ data: p });
        return p.code;
      },
    });
  }

  private assertCanManage(admin: SessionAdmin) {
    if (!hasAnySection(admin, COUNTRY_SECTIONS)) throw new ForbiddenException('You do not have access to this section');
  }

  /** Every signed-in admin can read the list (country access, prices and orders all use it). */
  async list() {
    const countries = await this.prisma.country.findMany({
      include: { learningRegion: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
    return {
      countries: countries.map((c) => ({
        code: c.code,
        name: c.name,
        currency: c.currency,
        deliveryCharge: Number(c.deliveryCharge),
        deliveryEstimate: c.deliveryEstimate,
        enabled: c.enabled,
        /** Assigned learning region; null = none yet: no learning content there (no default category, CR2). */
        learningRegion: c.learningRegion,
      })),
    };
  }

  async create(admin: SessionAdmin, dto: CreateCountryDto) {
    this.assertCanManage(admin);
    if (!isCountryCode(dto.code)) throw new BadRequestException('Use a two-letter country code.');
    if (!isCurrencyCode(dto.currency)) throw new BadRequestException('Use a valid ISO 4217 currency code.');
    if (await this.prisma.country.findUnique({ where: { code: dto.code } })) throw new ConflictException('That country already exists.');

    const payload: CountryPayload = {
      code: dto.code,
      name: dto.name,
      currency: dto.currency,
      deliveryCharge: dto.deliveryCharge,
      deliveryEstimate: dto.deliveryEstimate,
      enabled: dto.enabled,
    };
    const result = await this.drafts.saveOrDraft({ admin, mode: dto.mode, section: SECTION, entityType: COUNTRY_ENTITY, entityId: null, payload, label: `${dto.name} (${dto.code})` });
    return { ...result, notice: PRICES_MISSING };
  }

  async update(admin: SessionAdmin, code: string, dto: UpdateCountryDto) {
    this.assertCanManage(admin);
    const existing = await this.prisma.country.findUnique({ where: { code: code.toUpperCase() } });
    if (!existing) throw new NotFoundException('Country not found');
    if ((dto.code && dto.code !== existing.code) || (dto.currency && dto.currency !== existing.currency)) {
      throw new BadRequestException("A country's code and currency can't be changed.");
    }
    const payload: CountryPayload = {
      code: existing.code,
      name: dto.name ?? existing.name,
      currency: existing.currency,
      deliveryCharge: dto.deliveryCharge ?? Number(existing.deliveryCharge),
      deliveryEstimate: dto.deliveryEstimate !== undefined ? dto.deliveryEstimate : existing.deliveryEstimate,
      enabled: dto.enabled ?? existing.enabled,
    };
    return this.drafts.saveOrDraft({ admin, mode: dto.mode, section: SECTION, entityType: COUNTRY_ENTITY, entityId: existing.code, payload, label: `${payload.name} (${existing.code})` });
  }
}
