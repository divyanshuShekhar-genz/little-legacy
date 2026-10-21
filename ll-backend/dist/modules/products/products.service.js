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
exports.ProductsService = exports.PRODUCT_ENTITY = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const drafts_service_1 = require("../drafts/drafts.service");
const json_1 = require("../../common/utils/json");
const session_admin_1 = require("../../common/types/session-admin");
const plans_service_1 = require("../plans/plans.service");
exports.PRODUCT_ENTITY = 'Product';
const SECTION = 'Shop & Orders';
const sortedPrices = (prices) => Object.fromEntries(Object.entries(prices).sort(([a], [b]) => a.localeCompare(b)));
const pendingStatus = (p) => (p.requested === 'draft' ? 'DRAFT' : 'PENDING_APPROVAL');
async function liveContent(db, id) {
    const p = await db.product.findUnique({ where: { id }, include: { images: { orderBy: { position: 'asc' } }, prices: true } });
    if (!p)
        return null;
    return {
        id: p.id,
        title: p.title,
        sku: p.sku,
        category: p.category,
        ageRecommendation: p.ageRecommendation,
        description: p.description,
        details: p.details,
        materials: p.materials,
        stock: p.stock,
        status: p.status,
        images: p.images.map((i) => ({ url: i.url })),
        prices: sortedPrices(Object.fromEntries(p.prices.map((x) => [x.countryCode, x.amount.toFixed(2)]))),
    };
}
async function validate(db, c, opts) {
    if (!c.title)
        throw new common_1.BadRequestException('Enter a product title.');
    if (!c.sku)
        throw new common_1.BadRequestException('Enter a SKU.');
    const live = await db.product.findFirst({ where: { sku: { equals: c.sku, mode: 'insensitive' }, ...(opts.productId ? { id: { not: opts.productId } } : {}) } });
    const drafts = opts.checkDrafts === false ? [] : await db.draftApproval.findMany({ where: { entityType: exports.PRODUCT_ENTITY, entityId: null, status: 'PENDING', ...(opts.ownDraftId ? { id: { not: opts.ownDraftId } } : {}) } });
    if (live || drafts.some((d) => d.after.content.sku.toLowerCase() === c.sku.toLowerCase())) {
        throw new common_1.ConflictException('SKU must be unique.');
    }
    if (!Number.isInteger(c.stock) || c.stock < 0 || c.stock > 2_147_483_647)
        throw new common_1.BadRequestException('Stock must be a non-negative whole number.');
    const codes = Object.keys(c.prices);
    if (codes.length && (await db.country.count({ where: { code: { in: codes } } })) !== codes.length)
        throw new common_1.BadRequestException('Choose a country.');
    if (opts.goingLive && c.status === 'PUBLISHED' && (c.images.length === 0 || codes.length === 0)) {
        throw new common_1.BadRequestException('Add an image and at least one country price before publishing.');
    }
    const urls = [...new Set(c.images.map((i) => i.url))];
    if (urls.length && (await db.upload.count({ where: { url: { in: urls }, kind: 'IMAGE' } })) < urls.length) {
        throw new common_1.BadRequestException('Use an image uploaded with the image picker.');
    }
}
let ProductsService = class ProductsService {
    constructor(prisma, drafts, audit) {
        this.prisma = prisma;
        this.drafts = drafts;
        this.audit = audit;
    }
    onModuleInit() {
        this.drafts.register(exports.PRODUCT_ENTITY, {
            snapshot: liveContent,
            apply: async (tx, id, { content: c }) => {
                await validate(tx, c, { productId: id, ownDraftId: null, goingLive: true, checkDrafts: false });
                const data = {
                    title: c.title,
                    sku: c.sku,
                    category: c.category,
                    ageRecommendation: c.ageRecommendation,
                    description: c.description,
                    details: c.details,
                    materials: c.materials,
                    stock: c.stock,
                    status: c.status,
                };
                const productId = id ? (await tx.product.update({ where: { id }, data })).id : (await tx.product.create({ data })).id;
                await tx.productImage.deleteMany({ where: { productId } });
                await tx.productImage.createMany({ data: c.images.map((img, position) => ({ productId, url: img.url, position })) });
                await tx.productPrice.deleteMany({ where: { productId, countryCode: { notIn: Object.keys(c.prices) } } });
                for (const [countryCode, amount] of Object.entries(c.prices)) {
                    await tx.productPrice.upsert({
                        where: { productId_countryCode: { productId, countryCode } },
                        update: { amount },
                        create: { productId, countryCode, amount },
                    });
                }
                return productId;
            },
        });
    }
    async resolve(id) {
        const live = await liveContent(this.prisma, id);
        if (live) {
            const pending = await this.prisma.draftApproval.findFirst({ where: { entityType: exports.PRODUCT_ENTITY, entityId: id, status: 'PENDING' }, orderBy: { createdAt: 'desc' } });
            return { live, pending };
        }
        const draft = await this.prisma.draftApproval.findUnique({ where: { id } });
        if (draft && draft.entityType === exports.PRODUCT_ENTITY && draft.entityId === null && draft.status === 'PENDING')
            return { live: null, pending: draft };
        throw new common_1.NotFoundException('Product not found');
    }
    async list() {
        const [products, drafts, items] = await Promise.all([
            this.prisma.product.findMany({ include: { images: { orderBy: { position: 'asc' } }, prices: true }, orderBy: { title: 'asc' } }),
            this.prisma.draftApproval.findMany({ where: { entityType: exports.PRODUCT_ENTITY, status: 'PENDING' }, orderBy: { createdAt: 'desc' } }),
            this.prisma.orderItem.findMany({ where: { order: { status: { notIn: ['CANCELLED', 'REFUNDED'] } } }, select: { productId: true, quantity: true, order: { select: { countryCode: true } } } }),
        ]);
        const ordered = (productId) => {
            const byCountry = {};
            for (const i of items.filter((x) => x.productId === productId))
                byCountry[i.order.countryCode] = (byCountry[i.order.countryCode] ?? 0) + i.quantity;
            return byCountry;
        };
        const asContent = (d) => d.after;
        const imagesOf = (c) => c.images.map((img, position) => ({ id: null, url: img.url, position }));
        return {
            products: [
                ...products.map((p) => {
                    const draft = drafts.find((d) => d.entityId === p.id);
                    return {
                        id: p.id,
                        sku: p.sku,
                        title: p.title,
                        category: p.category,
                        ageRecommendation: p.ageRecommendation,
                        description: p.description,
                        details: p.details,
                        materials: p.materials,
                        stock: p.stock,
                        status: p.status,
                        images: p.images.map((i) => ({ id: i.id, url: i.url, position: i.position })),
                        prices: sortedPrices(Object.fromEntries(p.prices.map((x) => [x.countryCode, x.amount.toFixed(2)]))),
                        orderedByCountry: ordered(p.id),
                        pending: draft ? { status: pendingStatus(asContent(draft)), content: asContent(draft).content, draftId: draft.id } : null,
                    };
                }),
                ...drafts
                    .filter((d) => d.entityId === null)
                    .map((d) => {
                    const c = asContent(d).content;
                    return {
                        id: d.id,
                        sku: c.sku,
                        title: c.title,
                        category: c.category,
                        ageRecommendation: c.ageRecommendation,
                        description: c.description,
                        details: c.details,
                        materials: c.materials,
                        stock: c.stock,
                        status: pendingStatus(asContent(d)),
                        images: imagesOf(c),
                        prices: c.prices,
                        orderedByCountry: {},
                        pending: { status: pendingStatus(asContent(d)), content: c, draftId: d.id },
                    };
                }),
            ],
        };
    }
    content(dto) {
        return {
            title: dto.title,
            sku: dto.sku,
            category: dto.category ?? null,
            ageRecommendation: dto.ageRecommendation ?? null,
            description: dto.description ?? null,
            details: dto.details ?? null,
            materials: dto.materials ?? null,
            stock: typeof dto.stock === 'string' && dto.stock.trim() !== '' ? Number(dto.stock) : dto.stock,
            status: dto.status,
            images: dto.images.map((i) => ({ url: i.url })),
            prices: sortedPrices(Object.fromEntries(Object.entries(dto.prices).map(([code, v]) => [code.toUpperCase(), (0, plans_service_1.toAmount)(v, 'Prices must be zero or greater.')]))),
        };
    }
    async save(admin, id, dto) {
        const target = id ? await this.resolve(id) : { live: null, pending: null };
        const content = this.content(dto);
        await validate(this.prisma, content, { productId: target.live?.id ?? null, ownDraftId: target.live ? null : (target.pending?.id ?? null), goingLive: dto.mode === 'publish' });
        return this.drafts.saveOrDraft({
            admin,
            mode: dto.mode,
            section: SECTION,
            entityType: exports.PRODUCT_ENTITY,
            entityId: target.live?.id ?? null,
            payload: { requested: dto.mode, content },
            label: `${content.title} (${content.sku})`,
            pendingDraftId: target.pending?.id ?? null,
        });
    }
    async reject(admin, id, reason) {
        const { live, pending } = await this.resolve(id);
        if (!pending || pending.after.requested !== 'publish') {
            throw new common_1.BadRequestException('There is no change waiting for approval.');
        }
        if (live) {
            await this.drafts.reject(admin, pending.id, reason ?? 'Rejected in the editor.');
            return { status: 'rejected', id: live.id };
        }
        const payload = pending.after;
        await this.prisma.$transaction(async (tx) => {
            await tx.draftApproval.update({ where: { id: pending.id }, data: { after: (0, json_1.toJson)({ ...payload, requested: 'draft' }) ?? {} } });
            await this.audit.write(admin, { action: `Returned to draft: ${SECTION} · ${payload.content.title}${reason ? ` (${reason})` : ''}`, section: SECTION, entityType: exports.PRODUCT_ENTITY }, tx);
        });
        return { status: 'draft', draftId: pending.id };
    }
    async countryPrice(tx, admin, country, productId, value, mode) {
        const { code } = country;
        const live = await liveContent(tx, productId);
        if (!live) {
            const unpublished = await tx.draftApproval.count({ where: { id: productId, entityType: exports.PRODUCT_ENTITY, entityId: null, status: 'PENDING' } });
            if (unpublished)
                return null;
            throw new common_1.NotFoundException('Product not found');
        }
        const pending = await tx.draftApproval.findFirst({ where: { entityType: exports.PRODUCT_ENTITY, entityId: productId, status: 'PENDING' }, orderBy: { createdAt: 'desc' } });
        const direct = mode === 'publish' && (0, session_admin_1.canPublish)(admin);
        const { id: _id, ...liveFields } = live;
        const from = !direct && pending ? pending.after.content : liveFields;
        const prices = { ...from.prices };
        if (value === null)
            delete prices[code];
        else
            prices[code] = (0, plans_service_1.toAmount)(value, 'Enter prices of zero or more.');
        if (JSON.stringify(sortedPrices(prices)) === JSON.stringify(sortedPrices(from.prices)))
            return null;
        const content = { ...from, prices: sortedPrices(prices) };
        await validate(tx, content, { productId, ownDraftId: null, goingLive: mode === 'publish' });
        return this.drafts.saveOrDraft({
            admin,
            mode,
            section: SECTION,
            entityType: exports.PRODUCT_ENTITY,
            entityId: productId,
            payload: { requested: mode, content },
            label: `${content.title} price for ${country.name}`,
            pendingDraftId: direct ? null : (pending?.id ?? null),
            tx,
        });
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        drafts_service_1.DraftsService,
        audit_service_1.AuditService])
], ProductsService);
//# sourceMappingURL=products.service.js.map