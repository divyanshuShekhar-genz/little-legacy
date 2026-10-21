"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlansService = exports.PLAN_ENTITY = void 0;
exports.toAmount = toAmount;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const drafts_service_1 = require("../drafts/drafts.service");
const rules_1 = require("../../common/rules");
const session_admin_1 = require("../../common/types/session-admin");
const products_service_1 = require("../products/products.service");
exports.PLAN_ENTITY = 'Plan';
const SECTION = 'Subscriptions';
const MAX_AMOUNT = 9_999_999_999.99;
function toAmount(value, message) {
    const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
    if (!Number.isFinite(n) || n < 0 || n > MAX_AMOUNT || Math.round(n * 100) !== Number((n * 100).toFixed(6)))
        throw new common_1.BadRequestException(message);
    return n.toFixed(2);
}
const sortedPrices = (prices) => Object.fromEntries(Object.entries(prices).sort(([a], [b]) => a.localeCompare(b)));
const snapshot = async (tx, tier) => {
    const plan = await tx.plan.findUnique({ where: { tier: tier }, include: { prices: true } });
    if (!plan)
        return null;
    return {
        tier: plan.tier,
        name: plan.name,
        active: plan.active,
        memoryLimit: plan.memoryLimit,
        prices: plan.tier === 'FREE' ? {} : sortedPrices(Object.fromEntries(plan.prices.map((p) => [p.countryCode, p.amount.toFixed(2)]))),
    };
};
async function validate(db, p) {
    if (p.tier === 'FREE' && (!p.active || Object.keys(p.prices).length > 0))
        throw new common_1.BadRequestException('Free is always active and free.');
    const codes = Object.keys(p.prices);
    if (codes.length && (await db.country.count({ where: { code: { in: codes } } })) !== codes.length)
        throw new common_1.BadRequestException('Choose a country.');
}
let PlansService = class PlansService {
    constructor(prisma, drafts, products) {
        this.prisma = prisma;
        this.drafts = drafts;
        this.products = products;
    }
    onModuleInit() {
        this.drafts.register(exports.PLAN_ENTITY, {
            snapshot,
            apply: async (tx, tier, p) => {
                if (!tier || tier !== p.tier)
                    throw new common_1.NotFoundException('Plan not found');
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
    pendingDraft(tier, db = this.prisma) {
        return db.draftApproval.findFirst({ where: { entityType: exports.PLAN_ENTITY, entityId: tier, status: 'PENDING' }, orderBy: { createdAt: 'desc' } });
    }
    async list(admin) {
        if (!(0, session_admin_1.hasAnySection)(admin, ['subscriptions', 'memories']))
            throw new common_1.ForbiddenException('You do not have access to this section');
        const plans = await Promise.all(rules_1.PLAN_TIERS.map((tier) => snapshot(this.prisma, tier)));
        const pending = await this.prisma.draftApproval.findMany({ where: { entityType: exports.PLAN_ENTITY, status: 'PENDING' }, orderBy: { createdAt: 'desc' } });
        return {
            plans: plans
                .filter((p) => p !== null)
                .map((p) => {
                const draft = pending.find((d) => d.entityId === p.tier);
                const content = draft ? draft.after : null;
                return {
                    ...p,
                    pending: content
                        ? {
                            status: content.requested === 'draft' ? 'DRAFT' : 'PENDING_APPROVAL',
                            content: { active: content.active, memoryLimit: content.memoryLimit, prices: content.prices },
                            draftId: draft.id,
                        }
                        : null,
                };
            }),
        };
    }
    async base(tier, db = this.prisma) {
        const live = await snapshot(db, tier);
        if (!live)
            throw new common_1.NotFoundException('Plan not found');
        const draft = await this.pendingDraft(tier, db);
        const content = draft ? draft.after : live;
        return { live, draft, active: content.active, memoryLimit: content.memoryLimit, prices: { ...content.prices } };
    }
    async savePlan(admin, mode, payload, draftId, label, tx) {
        await validate(tx ?? this.prisma, payload);
        return this.drafts.saveOrDraft({ admin, mode, section: SECTION, entityType: exports.PLAN_ENTITY, entityId: payload.tier, payload, label, pendingDraftId: draftId, tx });
    }
    async publishOnly(admin, payload, label, tx) {
        await validate(tx, payload);
        return this.drafts.saveOrDraft({ admin, mode: 'publish', section: SECTION, entityType: exports.PLAN_ENTITY, entityId: payload.tier, payload, label, tx });
    }
    async update(admin, tierParam, dto) {
        const tier = tierParam.toUpperCase();
        if (!rules_1.PLAN_TIERS.includes(tier))
            throw new common_1.NotFoundException('Plan not found');
        const base = await this.base(tier);
        const prices = dto.prices
            ? Object.fromEntries(Object.entries(dto.prices).map(([code, v]) => [code.toUpperCase(), toAmount(v, 'Enter a non-negative price.')]))
            : base.prices;
        const payload = {
            tier,
            requested: dto.mode,
            active: dto.active ?? base.active,
            memoryLimit: dto.memoryLimit !== undefined ? dto.memoryLimit : base.memoryLimit,
            prices: sortedPrices(prices),
        };
        return this.savePlan(admin, dto.mode, payload, base.draft?.id ?? null, `${base.live.name} plan`);
    }
    async countryPrices(admin, codeParam, dto) {
        const code = codeParam.toUpperCase();
        const country = await this.prisma.country.findUnique({ where: { code } });
        if (!country)
            throw new common_1.NotFoundException('Country not found');
        const plans = dto.plans && Object.keys(dto.plans).length ? Object.entries(dto.plans) : [];
        const products = dto.products && Object.keys(dto.products).length ? Object.entries(dto.products) : [];
        if (plans.length && !(0, session_admin_1.hasAnySection)(admin, ['subscriptions']))
            throw new common_1.ForbiddenException('You do not have access to this section');
        if (products.length && !(0, session_admin_1.hasAnySection)(admin, ['shopOrders']))
            throw new common_1.ForbiddenException('You do not have access to this section');
        const items = await this.prisma.$transaction(async (tx) => {
            const saved = [];
            for (const [key, value] of plans) {
                const tier = key.toUpperCase();
                if (tier === 'FREE')
                    throw new common_1.BadRequestException('Free is always active and free.');
                if (tier !== 'PLUS' && tier !== 'PREMIUM')
                    throw new common_1.BadRequestException('Choose a plan.');
                const base = await this.base(tier, tx);
                const direct = dto.mode === 'publish' && (0, session_admin_1.canPublish)(admin);
                const from = direct ? { active: base.live.active, memoryLimit: base.live.memoryLimit, prices: { ...base.live.prices } } : base;
                const prices = { ...from.prices };
                if (value === null)
                    delete prices[code];
                else
                    prices[code] = toAmount(value, 'Enter prices of zero or more.');
                if (JSON.stringify(sortedPrices(prices)) === JSON.stringify(sortedPrices(from.prices)))
                    continue;
                const payload = { tier, requested: dto.mode, active: from.active, memoryLimit: from.memoryLimit, prices: sortedPrices(prices) };
                const label = `${base.live.name} price for ${country.name}`;
                saved.push(direct
                    ? await this.publishOnly(admin, payload, label, tx)
                    : await this.savePlan(admin, dto.mode, payload, base.draft?.id ?? null, label, tx));
            }
            for (const [productId, value] of products) {
                const result = await this.products.countryPrice(tx, admin, country, productId, value, dto.mode);
                if (result)
                    saved.push(result);
            }
            return saved;
        }, { timeout: 30_000 });
        return { status: items.some((i) => i.status === 'draft') ? 'draft' : 'published', items };
    }
};
exports.PlansService = PlansService;
exports.PlansService = PlansService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        drafts_service_1.DraftsService,
        products_service_1.ProductsService])
], PlansService);
//# sourceMappingURL=plans.service.js.map