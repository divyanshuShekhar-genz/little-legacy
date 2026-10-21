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
exports.CountriesService = exports.COUNTRY_SECTIONS = exports.COUNTRY_ENTITY = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const drafts_service_1 = require("../drafts/drafts.service");
const rules_1 = require("../../common/rules");
const session_admin_1 = require("../../common/types/session-admin");
exports.COUNTRY_ENTITY = 'Country';
const SECTION = 'Countries';
exports.COUNTRY_SECTIONS = ['subscriptions', 'shopOrders'];
const PRICES_MISSING = 'Product and subscription prices are missing; configure them before purchase.';
const snapshot = async (tx, code) => {
    const c = await tx.country.findUnique({ where: { code } });
    return c && { code: c.code, name: c.name, currency: c.currency, deliveryCharge: Number(c.deliveryCharge), deliveryEstimate: c.deliveryEstimate, enabled: c.enabled };
};
let CountriesService = class CountriesService {
    constructor(prisma, drafts) {
        this.prisma = prisma;
        this.drafts = drafts;
    }
    onModuleInit() {
        this.drafts.register(exports.COUNTRY_ENTITY, {
            snapshot,
            apply: async (tx, code, p) => {
                if (code) {
                    await tx.country.update({ where: { code }, data: { name: p.name, deliveryCharge: p.deliveryCharge, deliveryEstimate: p.deliveryEstimate, enabled: p.enabled } });
                    return code;
                }
                if (await tx.country.findUnique({ where: { code: p.code } }))
                    throw new common_1.ConflictException('That country already exists.');
                await tx.country.create({ data: p });
                return p.code;
            },
        });
    }
    assertCanManage(admin) {
        if (!(0, session_admin_1.hasAnySection)(admin, exports.COUNTRY_SECTIONS))
            throw new common_1.ForbiddenException('You do not have access to this section');
    }
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
                learningRegion: c.learningRegion,
            })),
        };
    }
    async create(admin, dto) {
        this.assertCanManage(admin);
        if (!(0, rules_1.isCountryCode)(dto.code))
            throw new common_1.BadRequestException('Use a two-letter country code.');
        if (!(0, rules_1.isCurrencyCode)(dto.currency))
            throw new common_1.BadRequestException('Use a valid ISO 4217 currency code.');
        if (await this.prisma.country.findUnique({ where: { code: dto.code } }))
            throw new common_1.ConflictException('That country already exists.');
        const payload = {
            code: dto.code,
            name: dto.name,
            currency: dto.currency,
            deliveryCharge: dto.deliveryCharge,
            deliveryEstimate: dto.deliveryEstimate,
            enabled: dto.enabled,
        };
        const result = await this.drafts.saveOrDraft({ admin, mode: dto.mode, section: SECTION, entityType: exports.COUNTRY_ENTITY, entityId: null, payload, label: `${dto.name} (${dto.code})` });
        return { ...result, notice: PRICES_MISSING };
    }
    async update(admin, code, dto) {
        this.assertCanManage(admin);
        const existing = await this.prisma.country.findUnique({ where: { code: code.toUpperCase() } });
        if (!existing)
            throw new common_1.NotFoundException('Country not found');
        if ((dto.code && dto.code !== existing.code) || (dto.currency && dto.currency !== existing.currency)) {
            throw new common_1.BadRequestException("A country's code and currency can't be changed.");
        }
        const payload = {
            code: existing.code,
            name: dto.name ?? existing.name,
            currency: existing.currency,
            deliveryCharge: dto.deliveryCharge ?? Number(existing.deliveryCharge),
            deliveryEstimate: dto.deliveryEstimate !== undefined ? dto.deliveryEstimate : existing.deliveryEstimate,
            enabled: dto.enabled ?? existing.enabled,
        };
        return this.drafts.saveOrDraft({ admin, mode: dto.mode, section: SECTION, entityType: exports.COUNTRY_ENTITY, entityId: existing.code, payload, label: `${payload.name} (${existing.code})` });
    }
};
exports.CountriesService = CountriesService;
exports.CountriesService = CountriesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        drafts_service_1.DraftsService])
], CountriesService);
//# sourceMappingURL=countries.service.js.map