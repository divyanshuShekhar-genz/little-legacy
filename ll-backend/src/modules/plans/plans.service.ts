import { BadRequestException, ForbiddenException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DraftsService, type SaveResult, type Tx } from '../drafts/drafts.service';
import { PLAN_TIERS, type PlanTier } from '../../common/rules';
import { canPublish, hasAnySection, type SessionAdmin } from '../../common/types/session-admin';
import type { CountryPricesDto, UpdatePlanDto } from './dto/plan.dto';
import { ProductsService } from '../products/products.service';

/**
 * Plans & country prices (guide §19; API_REQUESTS #20). Subscriptions are per child; prices are
 * per country, in its own currency, entered by hand and NEVER converted. A missing price = not
 * purchasable there; 0 = free.
 *
 * Decisions 2026-10-14:
 * 1. One pending change per plan (saveOrDraft `pendingDraftId`), returned with its `draftId`.
 * 2. Free is locked: always active, free everywhere, no prices (Q33); its memory allowance stays editable.
 * 3. Only `subscriptions` changes plans (allowances included); `memories` reads them.
 * 4. "Edit prices" saves each changed plan as its own change. A draft builds on the plan's pending
 *    change (one pending change per plan); a DIRECT publish starts from the live plan and leaves the
 *    pending change alone — the admin only saw this country's price, so nobody else's unapproved
 *    change may go live with it (that pending draft then gets the usual 409 when reviewed).
 * 5. Amounts are strings with 2 decimals ("199.00").
 */

export const PLAN_ENTITY = 'Plan';
const SECTION = 'Subscriptions';
const MAX_AMOUNT = 9_999_999_999.99; // Decimal(12, 2)

interface PlanPayload {
  tier: PlanTier;
  /** 'draft' = "Save in draft"; 'publish' = waiting for approval. */
  requested: 'publish' | 'draft';
  active: boolean;
  memoryLimit: number | null;
  /** { countryCode: "199.00" } — a missing country is not purchasable there. */
  prices: Record<string, string>;
}

/** "199" / 199 / "199.5" → "199.00" / "199.50"; anything else → the given message. */
export function toAmount(value: unknown, message: string): string {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  if (!Number.isFinite(n) || n < 0 || n > MAX_AMOUNT || Math.round(n * 100) !== Number((n * 100).toFixed(6))) throw new BadRequestException(message);
  return n.toFixed(2);
}

const sortedPrices = (prices: Record<string, string>) => Object.fromEntries(Object.entries(prices).sort(([a], [b]) => a.localeCompare(b)));

const snapshot = async (tx: Tx, tier: string) => {
  const plan = await tx.plan.findUnique({ where: { tier: tier as PlanTier }, include: { prices: true } });
  if (!plan) return null;
  return {
    tier: plan.tier,
    name: plan.name,
    active: plan.active,
    memoryLimit: plan.memoryLimit,
    prices: plan.tier === 'FREE' ? {} : sortedPrices(Object.fromEntries(plan.prices.map((p) => [p.countryCode, p.amount.toFixed(2)]))),
  };
};

/** Free is locked; every price is for an existing country. */
async function validate(db: Tx, p: PlanPayload) {
  if (p.tier === 'FREE' && (!p.active || Object.keys(p.prices).length > 0)) throw new BadRequestException('Free is always active and free.');
  const codes = Object.keys(p.prices);
  if (codes.length && (await db.country.count({ where: { code: { in: codes } } })) !== codes.length) throw new BadRequestException('Choose a country.');
}

@Injectable()
export class PlansService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly drafts: DraftsService,
    private readonly products: ProductsService,
  ) {}

  onModuleInit() {
    this.drafts.register<PlanPayload>(PLAN_ENTITY, {
      snapshot,
      apply: async (tx, tier, p) => {
        if (!tier || tier !== p.tier) throw new NotFoundException('Plan not found');
        await validate(tx, p);
        await tx.plan.update({ where: { tier: p.tier }, data: { active: p.active, memoryLimit: p.memoryLimit } });
        const codes = Object.keys(p.prices);
        await tx.planPrice.deleteMany({ where: { planTier: p.tier, countryCode: { notIn: codes } } });
        for (const [countryCode, amount] of Object.entries(p.prices)) {
          await tx.planPrice.upsert({
            where: { planTier_countryCode: { planTier: p.tier, countryCode } },
            update: { amount },
            create: { planTier: p.tier, countryCode, amount },
          });
        }
        return p.tier;
      },
    });
  }

  private pendingDraft(tier: PlanTier, db: Tx = this.prisma) {
    return db.draftApproval.findFirst({ where: { entityType: PLAN_ENTITY, entityId: tier, status: 'PENDING' }, orderBy: { createdAt: 'desc' } });
  }

  /** Subscriptions and Memories both read plans (decision 3). */
  async list(admin: SessionAdmin) {
    if (!hasAnySection(admin, ['subscriptions', 'memories'])) throw new ForbiddenException('You do not have access to this section');
    const plans = await Promise.all(PLAN_TIERS.map((tier) => snapshot(this.prisma, tier)));
    const pending = await this.prisma.draftApproval.findMany({ where: { entityType: PLAN_ENTITY, status: 'PENDING' }, orderBy: { createdAt: 'desc' } });
    return {
      plans: plans
        .filter((p): p is NonNullable<typeof p> => p !== null)
        .map((p) => {
          const draft = pending.find((d) => d.entityId === p.tier);
          const content = draft ? (draft.after as unknown as PlanPayload) : null;
          return {
            ...p,
            pending: content
              ? {
                  status: content.requested === 'draft' ? ('DRAFT' as const) : ('PENDING_APPROVAL' as const),
                  content: { active: content.active, memoryLimit: content.memoryLimit, prices: content.prices },
                  draftId: draft!.id,
                }
              : null,
          };
        }),
    };
  }

  /** The plan's current content: its pending change if it has one, otherwise what's live. */
  private async base(tier: PlanTier, db: Tx = this.prisma) {
    const live = await snapshot(db, tier);
    if (!live) throw new NotFoundException('Plan not found');
    const draft = await this.pendingDraft(tier, db);
    const content = draft ? (draft.after as unknown as PlanPayload) : live;
    return { live, draft, active: content.active, memoryLimit: content.memoryLimit, prices: { ...content.prices } };
  }

  private async savePlan(admin: SessionAdmin, mode: 'publish' | 'draft', payload: PlanPayload, draftId: string | null, label: string, tx?: Tx): Promise<SaveResult> {
    await validate(tx ?? this.prisma, payload);
    return this.drafts.saveOrDraft<PlanPayload>({ admin, mode, section: SECTION, entityType: PLAN_ENTITY, entityId: payload.tier, payload, label, pendingDraftId: draftId, tx });
  }

  /** A direct publish that doesn't touch the plan's pending draft (decision 4). */
  private async publishOnly(admin: SessionAdmin, payload: PlanPayload, label: string, tx: Tx): Promise<SaveResult> {
    await validate(tx, payload);
    return this.drafts.saveOrDraft<PlanPayload>({ admin, mode: 'publish', section: SECTION, entityType: PLAN_ENTITY, entityId: payload.tier, payload, label, tx });
  }

  async update(admin: SessionAdmin, tierParam: string, dto: UpdatePlanDto) {
    const tier = tierParam.toUpperCase() as PlanTier;
    if (!(PLAN_TIERS as readonly string[]).includes(tier)) throw new NotFoundException('Plan not found');
    const base = await this.base(tier);
    const prices = dto.prices
      ? Object.fromEntries(Object.entries(dto.prices).map(([code, v]) => [code.toUpperCase(), toAmount(v, 'Enter a non-negative price.')]))
      : base.prices;
    const payload: PlanPayload = {
      tier,
      requested: dto.mode,
      active: dto.active ?? base.active,
      memoryLimit: dto.memoryLimit !== undefined ? dto.memoryLimit : base.memoryLimit,
      prices: sortedPrices(prices),
    };
    return this.savePlan(admin, dto.mode, payload, base.draft?.id ?? null, `${base.live.name} plan`);
  }

  /**
   * "Edit prices · {country}": one change per plan or product whose price here actually changes
   * (decision 4). The whole request is one transaction: if any part fails, nothing is saved, so the
   * admin never sees an error after part of the form went through (API_REQUESTS open ask (f)).
   */
  async countryPrices(admin: SessionAdmin, codeParam: string, dto: CountryPricesDto) {
    const code = codeParam.toUpperCase();
    const country = await this.prisma.country.findUnique({ where: { code } });
    if (!country) throw new NotFoundException('Country not found');
    const plans = dto.plans && Object.keys(dto.plans).length ? Object.entries(dto.plans) : [];
    const products = dto.products && Object.keys(dto.products).length ? Object.entries(dto.products) : [];
    if (plans.length && !hasAnySection(admin, ['subscriptions'])) throw new ForbiddenException('You do not have access to this section');
    // Product prices (API_REQUESTS #21): Shop & Orders.
    if (products.length && !hasAnySection(admin, ['shopOrders'])) throw new ForbiddenException('You do not have access to this section');

    const items = await this.prisma.$transaction(
      async (tx) => {
        const saved: SaveResult[] = [];
        for (const [key, value] of plans) {
          const tier = key.toUpperCase() as PlanTier;
          if (tier === 'FREE') throw new BadRequestException('Free is always active and free.');
          if (tier !== 'PLUS' && tier !== 'PREMIUM') throw new BadRequestException('Choose a plan.');
          const base = await this.base(tier, tx);
          const direct = dto.mode === 'publish' && canPublish(admin);
          const from = direct ? { active: base.live.active, memoryLimit: base.live.memoryLimit, prices: { ...base.live.prices } } : base;
          const prices = { ...from.prices };
          if (value === null) delete prices[code];
          else prices[code] = toAmount(value, 'Enter prices of zero or more.');
          if (JSON.stringify(sortedPrices(prices)) === JSON.stringify(sortedPrices(from.prices))) continue; // unchanged
          const payload: PlanPayload = { tier, requested: dto.mode, active: from.active, memoryLimit: from.memoryLimit, prices: sortedPrices(prices) };
          const label = `${base.live.name} price for ${country.name}`;
          saved.push(
            direct
              ? await this.publishOnly(admin, payload, label, tx)
              : await this.savePlan(admin, dto.mode, payload, base.draft?.id ?? null, label, tx),
          );
        }
        for (const [productId, value] of products) {
          const result = await this.products.countryPrice(tx, admin, country, productId, value, dto.mode);
          if (result) saved.push(result);
        }
        return saved;
      },
      // Many products can be saved at once; Prisma's default limit is 5 s.
      { timeout: 30_000 },
    );
    return { status: items.some((i) => i.status === 'draft') ? ('draft' as const) : ('published' as const), items };
  }
}
