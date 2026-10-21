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
exports.RegionalExportService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const progression_service_1 = require("../progression/progression.service");
const groups_query_1 = require("../activity-groups/groups.query");
let RegionalExportService = class RegionalExportService {
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async export(admin, regionId) {
        if (regionId && !(await this.prisma.learningRegion.count({ where: { id: regionId } }))) {
            throw new common_1.BadRequestException('Choose a regional learning category.');
        }
        const regions = await this.prisma.learningRegion.findMany({
            where: regionId ? { id: regionId } : {},
            orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
            include: { countries: { select: { code: true, name: true }, orderBy: { name: 'asc' } } },
        });
        const catalogues = {};
        for (const r of regions)
            catalogues[r.id] = await this.catalogue(r.id);
        await this.audit.write(admin, {
            action: regionId ? `Exported regional learning: ${regions[0].name}` : 'Exported regional learning',
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
    async catalogue(regionId) {
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
            (0, progression_service_1.readSettings)(this.prisma, regionId),
            (0, groups_query_1.listGroups)(this.prisma, regionId),
        ]);
        return {
            ageGroups: ageGroups.map((g) => g.age),
            areas: areas.map((a) => ({
                ...a,
                questions: a.questions.map((q) => ({ ...q, options: q.options.map((o) => ({ ...o, marks: o.marks.toFixed(2) })) })),
            })),
            activities: activities.map(({ regionId: _regionId, ...a }) => a),
            assessmentRules: assessment ? { revision: assessment.revision, rules: assessment.rules, createdAt: assessment.createdAt } : null,
            mandatory,
            progression,
            activityGroups,
        };
    }
};
exports.RegionalExportService = RegionalExportService;
exports.RegionalExportService = RegionalExportService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], RegionalExportService);
//# sourceMappingURL=regional-export.service.js.map