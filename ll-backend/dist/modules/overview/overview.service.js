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
exports.OverviewService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let OverviewService = class OverviewService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async stats() {
        const [childProfiles, activities, communityQueue, openEnquiries, childLevels] = await Promise.all([
            this.prisma.child.count(),
            this.prisma.activity.count({ where: { withdrawnAt: null } }),
            this.prisma.communityPost.count({ where: { status: 'AWAITING_MODERATION' } }),
            this.prisma.enquiry.count({ where: { status: { not: 'RESOLVED' } } }),
            this.prisma.childAreaLevel.groupBy({ by: ['childId'], _max: { level: true } }),
        ]);
        const counts = new Map();
        for (const row of childLevels) {
            const level = Math.max(1, row._max.level ?? 1);
            counts.set(level, (counts.get(level) ?? 0) + 1);
        }
        counts.set(1, (counts.get(1) ?? 0) + (childProfiles - childLevels.length));
        const maxLevel = Math.max(3, ...counts.keys());
        const childrenByLevel = Array.from({ length: maxLevel }, (_, i) => ({ level: i + 1, count: counts.get(i + 1) ?? 0 }));
        return { childProfiles, activities, communityQueue, openEnquiries, childrenByLevel };
    }
};
exports.OverviewService = OverviewService;
exports.OverviewService = OverviewService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OverviewService);
//# sourceMappingURL=overview.service.js.map