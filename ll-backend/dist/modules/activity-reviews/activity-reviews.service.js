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
exports.ActivityReviewsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let ActivityReviewsService = class ActivityReviewsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list({ difficulty }) {
        const attempts = await this.prisma.activityAttempt.findMany({
            where: { outcome: { not: 'NOT_COMPLETED' }, ...(difficulty ? { feedback: { difficulty } } : {}) },
            include: {
                child: { select: { name: true, parent: { select: { email: true } } } },
                activity: { select: { title: true } },
                feedback: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        return {
            rows: attempts.map((a) => ({
                id: a.id,
                completedAt: a.createdAt.toISOString(),
                childName: a.child.name,
                parentEmail: a.child.parent.email,
                activity: a.activity.title,
                repeat: a.repeat,
                completionPercent: 100,
                difficulty: a.feedback?.difficulty ?? null,
                enjoyment: a.feedback?.enjoyment ?? null,
                note: a.feedback?.note ?? null,
                elapsedSeconds: a.elapsedSeconds,
            })),
        };
    }
};
exports.ActivityReviewsService = ActivityReviewsService;
exports.ActivityReviewsService = ActivityReviewsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ActivityReviewsService);
//# sourceMappingURL=activity-reviews.service.js.map