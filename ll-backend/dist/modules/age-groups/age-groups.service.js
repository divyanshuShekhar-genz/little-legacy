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
exports.AgeGroupsService = exports.AGE_GROUP_ENTITY = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const drafts_service_1 = require("../drafts/drafts.service");
const region_1 = require("../../common/utils/region");
exports.AGE_GROUP_ENTITY = 'AgeGroup';
const SECTION = 'Developmental Milestones';
const snapshot = (tx, id) => tx.ageGroup.findUnique({ where: { id }, select: { id: true, regionId: true, age: true } });
async function assertAgeFree(db, regionId, age) {
    if (await db.ageGroup.findUnique({ where: { regionId_age: { regionId, age } } }))
        throw new common_1.ConflictException('That age group already exists.');
}
let AgeGroupsService = class AgeGroupsService {
    constructor(prisma, drafts) {
        this.prisma = prisma;
        this.drafts = drafts;
    }
    onModuleInit() {
        this.drafts.register(exports.AGE_GROUP_ENTITY, {
            snapshot,
            apply: async (tx, _id, payload) => {
                await (0, region_1.assertRegion)(tx, payload.regionId);
                await assertAgeFree(tx, payload.regionId, payload.age);
                return (await tx.ageGroup.create({ data: payload })).id;
            },
        });
    }
    async list(regionId) {
        await (0, region_1.assertRegion)(this.prisma, regionId);
        const ageGroups = await this.prisma.ageGroup.findMany({ where: { regionId }, select: { id: true, age: true }, orderBy: { age: 'asc' } });
        return { ageGroups };
    }
    async create(admin, dto) {
        await (0, region_1.assertRegion)(this.prisma, dto.regionId);
        await assertAgeFree(this.prisma, dto.regionId, dto.age);
        return this.drafts.saveOrDraft({
            admin,
            mode: dto.mode,
            section: SECTION,
            entityType: exports.AGE_GROUP_ENTITY,
            entityId: null,
            regionId: dto.regionId,
            payload: { regionId: dto.regionId, age: dto.age },
            label: `Age group ${dto.age} years`,
        });
    }
};
exports.AgeGroupsService = AgeGroupsService;
exports.AgeGroupsService = AgeGroupsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        drafts_service_1.DraftsService])
], AgeGroupsService);
//# sourceMappingURL=age-groups.service.js.map