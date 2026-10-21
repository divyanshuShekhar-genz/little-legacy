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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_service_1 = require("../../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const session_admin_1 = require("../../common/types/session-admin");
const EMAIL_IN_USE = 'An account already uses that email.';
let AdminsService = class AdminsService {
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async list() {
        const admins = await this.prisma.adminUser.findMany({ orderBy: [{ role: 'asc' }, { name: 'asc' }] });
        return { admins: admins.map(session_admin_1.toSessionAdmin) };
    }
    async assertEmailFree(email, excludeId) {
        const taken = await this.prisma.adminUser.findFirst({
            where: { email: { equals: email, mode: 'insensitive' }, ...(excludeId ? { id: { not: excludeId } } : {}) },
            select: { id: true },
        });
        if (taken)
            throw new common_1.ConflictException(EMAIL_IN_USE);
    }
    async withEmailConflict(work) {
        try {
            return await work();
        }
        catch (e) {
            if (e instanceof client_1.Prisma.PrismaClientKnownRequestError && e.code === 'P2002')
                throw new common_1.ConflictException(EMAIL_IN_USE);
            throw e;
        }
    }
    async create(actor, { password, ...input }) {
        await this.assertEmailFree(input.email);
        const admin = await this.withEmailConflict(() => this.prisma.$transaction(async (tx) => {
            const created = await tx.adminUser.create({
                data: { ...input, role: 'SUB_ADMIN', passwordHash: await bcryptjs_1.default.hash(password, 10) },
            });
            await this.audit.write(actor, { action: `Created Sub Admin account: ${created.name}`, section: 'team', entityType: 'AdminUser', entityId: created.id, after: (0, session_admin_1.toSessionAdmin)(created) }, tx);
            return created;
        }));
        return { admin: (0, session_admin_1.toSessionAdmin)(admin) };
    }
    async update(actor, id, input) {
        const existing = await this.prisma.adminUser.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException();
        if (existing.id === actor.id)
            throw new common_1.BadRequestException("You can't change your own account here.");
        if (existing.role === 'SUPER_ADMIN')
            throw new common_1.BadRequestException('Super Admin permissions cannot be edited here.');
        if (input.email)
            await this.assertEmailFree(input.email, id);
        const admin = await this.withEmailConflict(() => this.prisma.$transaction(async (tx) => {
            const updated = await tx.adminUser.update({ where: { id }, data: input });
            await this.audit.write(actor, {
                action: `Updated Sub Admin account and permissions: ${updated.name}`,
                section: 'team',
                entityType: 'AdminUser',
                entityId: updated.id,
                before: (0, session_admin_1.toSessionAdmin)(existing),
                after: (0, session_admin_1.toSessionAdmin)(updated),
            }, tx);
            return updated;
        }));
        return { admin: (0, session_admin_1.toSessionAdmin)(admin) };
    }
};
exports.AdminsService = AdminsService;
exports.AdminsService = AdminsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], AdminsService);
//# sourceMappingURL=admins.service.js.map