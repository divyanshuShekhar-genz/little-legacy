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
exports.ExportsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
let ExportsService = class ExportsService {
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async parentSettings(admin) {
        const regions = await this.prisma.learningRegion.findMany({
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                areas: {
                    where: { removedAt: null },
                    orderBy: { position: 'asc' },
                    include: {
                        categories: { where: { removedAt: null } },
                        levels: { where: { OR: [{ categoryId: null }, { category: { removedAt: null } }] }, orderBy: { number: 'asc' } },
                        questions: { orderBy: { position: 'asc' }, include: { options: { orderBy: { position: 'asc' } } } },
                    },
                },
                activities: {
                    where: { withdrawnAt: null },
                    include: { steps: { orderBy: { position: 'asc' } }, previews: { orderBy: { position: 'asc' } } },
                },
            },
        });
        await this.audit.write(admin, { action: 'Exported parent settings' });
        return { type: 'little-legacy-admin-settings', exportedAt: new Date().toISOString(), regions };
    }
    async assessmentSettings(admin) {
        const regions = await this.prisma.learningRegion.findMany({
            orderBy: { name: 'asc' },
            select: { id: true, name: true, assessmentConfigs: { orderBy: { revision: 'desc' }, take: 1 }, mandatoryActivities: true },
        });
        await this.audit.write(admin, { action: 'Exported assessment settings' });
        return {
            type: 'little-legacy-assessment-settings',
            exportedAt: new Date().toISOString(),
            regions: regions.map(({ assessmentConfigs, ...r }) => ({ ...r, current: assessmentConfigs[0] ?? null })),
        };
    }
};
exports.ExportsService = ExportsService;
exports.ExportsService = ExportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], ExportsService);
//# sourceMappingURL=exports.service.js.map