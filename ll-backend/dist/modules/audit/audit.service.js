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
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const json_1 = require("../../common/utils/json");
let AuditService = class AuditService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    write(admin, input, db = this.prisma) {
        return db.auditLog.create({
            data: {
                actorId: admin.id,
                actorName: admin.name,
                actorRole: admin.role,
                action: input.action,
                section: input.section,
                entityType: input.entityType,
                entityId: input.entityId ?? undefined,
                before: (0, json_1.toJson)(input.before),
                after: (0, json_1.toJson)(input.after),
            },
        });
    }
    async list(take, cursor) {
        const entries = await this.prisma.auditLog.findMany({
            orderBy: { createdAt: 'desc' },
            take,
            ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        });
        return { entries, nextCursor: entries.length === take ? (entries.at(-1)?.id ?? null) : null };
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditService);
//# sourceMappingURL=audit.service.js.map