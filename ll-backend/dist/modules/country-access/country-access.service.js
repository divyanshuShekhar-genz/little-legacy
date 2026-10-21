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
exports.CountryAccessService = exports.RESTRICTION_ENTITY = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const drafts_service_1 = require("../drafts/drafts.service");
const rules_1 = require("../../common/rules");
const session_admin_1 = require("../../common/types/session-admin");
exports.RESTRICTION_ENTITY = 'CountryRestriction';
const SECTION = 'Country access';
const snapshot = (tx, id) => tx.countryRestriction.findUnique({
    where: { id },
    select: { id: true, countryCode: true, type: true, targetId: true, message: true, enabled: true },
});
let CountryAccessService = class CountryAccessService {
    constructor(prisma, drafts) {
        this.prisma = prisma;
        this.drafts = drafts;
    }
    onModuleInit() {
        this.drafts.register(exports.RESTRICTION_ENTITY, {
            snapshot,
            apply: async (tx, id, payload) => {
                if (payload.delete) {
                    if (!id)
                        throw new common_1.BadRequestException('A restriction id is required.');
                    await tx.countryRestriction.delete({ where: { id } });
                    return id;
                }
                const data = {
                    countryCode: payload.countryCode,
                    type: payload.type,
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
    manageable(admin, requested) {
        const wanted = requested?.length ? requested : rules_1.RESTRICTION_TYPE_KEYS;
        return wanted.filter((t) => (0, session_admin_1.isSuperAdmin)(admin) || admin.permissions.includes(rules_1.RESTRICTION_TYPES[t].section));
    }
    assertCanManage(admin, type) {
        if (!this.manageable(admin, [type]).length)
            throw new common_1.ForbiddenException('You do not have access to this section');
    }
    async targets(type) {
        if (rules_1.RESTRICTION_TYPES[type].scope === 'section')
            return [{ id: null, name: 'Entire section' }];
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
    async list(admin, types) {
        const allowed = this.manageable(admin, types);
        const [countries, rules] = await Promise.all([
            this.prisma.country.findMany({ select: { code: true, name: true, enabled: true }, orderBy: { name: 'asc' } }),
            this.prisma.countryRestriction.findMany({
                where: { type: { in: allowed } },
                include: { country: { select: { name: true } } },
                orderBy: [{ countryCode: 'asc' }, { type: 'asc' }],
            }),
        ]);
        const targetsByType = Object.fromEntries(await Promise.all(allowed.map(async (t) => [t, await this.targets(t)])));
        return {
            countries,
            types: allowed.map((t) => ({ type: t, label: rules_1.RESTRICTION_TYPES[t].label, targets: targetsByType[t] ?? [] })),
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
    async validate(dto, excludeId) {
        const country = await this.prisma.country.findUnique({ where: { code: dto.countryCode } });
        const targetId = rules_1.RESTRICTION_TYPES[dto.type].scope === 'section' ? null : (dto.targetId ?? null);
        const targets = await this.targets(dto.type);
        if (!country || !targets.some((t) => t.id === targetId))
            throw new common_1.BadRequestException('Choose a valid country, target and message.');
        const duplicate = await this.prisma.countryRestriction.findFirst({
            where: { countryCode: dto.countryCode, type: dto.type, targetId, ...(excludeId ? { id: { not: excludeId } } : {}) },
        });
        if (duplicate)
            throw new common_1.ConflictException('A rule already exists for that country and target. Edit it instead.');
        return { countryCode: dto.countryCode, type: dto.type, targetId, message: dto.message, enabled: dto.enabled };
    }
    async create(admin, dto) {
        this.assertCanManage(admin, dto.type);
        const payload = await this.validate(dto);
        return this.drafts.saveOrDraft({
            admin,
            mode: dto.mode,
            section: SECTION,
            entityType: exports.RESTRICTION_ENTITY,
            entityId: null,
            payload,
            label: `${rules_1.RESTRICTION_TYPES[dto.type].label} restriction for ${dto.countryCode}`,
        });
    }
    async update(admin, id, dto) {
        const existing = await this.prisma.countryRestriction.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('Restriction not found');
        this.assertCanManage(admin, existing.type);
        this.assertCanManage(admin, dto.type);
        const payload = await this.validate(dto, id);
        return this.drafts.saveOrDraft({
            admin,
            mode: dto.mode,
            section: SECTION,
            entityType: exports.RESTRICTION_ENTITY,
            entityId: id,
            payload,
            label: `${rules_1.RESTRICTION_TYPES[dto.type].label} restriction for ${dto.countryCode}`,
        });
    }
    async remove(admin, id, dto) {
        const existing = await this.prisma.countryRestriction.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('Restriction not found');
        this.assertCanManage(admin, existing.type);
        return this.drafts.saveOrDraft({
            admin,
            mode: dto.mode,
            section: SECTION,
            entityType: exports.RESTRICTION_ENTITY,
            entityId: id,
            payload: { delete: true },
            label: `Removed ${rules_1.RESTRICTION_TYPES[existing.type].label} restriction for ${existing.countryCode}`,
        });
    }
    async preview(countryCode) {
        const [rules, activities] = await Promise.all([
            this.prisma.countryRestriction.findMany(),
            this.targets('ACTIVITY'),
        ]);
        const ruleSet = rules.map((r) => ({ ...r, type: r.type }));
        const sectionTypes = rules_1.RESTRICTION_TYPE_KEYS.filter((t) => rules_1.RESTRICTION_TYPES[t].scope === 'section');
        const row = (label, type, targetId) => {
            const check = (0, rules_1.countryCheck)(ruleSet, countryCode, { type, targetId });
            return {
                label,
                check: { COUNTRY_REQUIRED: 'Country required', BLOCKED: 'Blocked', ALLOWED: 'No country restriction' }[check.status],
                reason: check.status === 'BLOCKED' ? check.message : '',
            };
        };
        return {
            rows: [
                ...sectionTypes.map((t) => row(rules_1.RESTRICTION_TYPES[t].label, t, null)),
                ...activities.map((a) => row(a.name, 'ACTIVITY', a.id)),
            ],
        };
    }
    async exportRules(admin) {
        const [countries, rules] = await Promise.all([
            this.prisma.country.findMany({ select: { code: true, name: true } }),
            this.prisma.countryRestriction.findMany({ where: { type: { in: this.manageable(admin) } } }),
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
};
exports.CountryAccessService = CountryAccessService;
exports.CountryAccessService = CountryAccessService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        drafts_service_1.DraftsService])
], CountryAccessService);
//# sourceMappingURL=country-access.service.js.map