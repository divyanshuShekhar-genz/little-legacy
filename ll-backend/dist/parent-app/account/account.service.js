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
exports.AccountService = exports.DELETED_NAME = void 0;
const common_1 = require("@nestjs/common");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_service_1 = require("../../prisma/prisma.service");
const app_auth_service_1 = require("../auth/app-auth.service");
const parent_tokens_service_1 = require("../common/parent-tokens.service");
const parent_views_1 = require("../common/parent-views");
exports.DELETED_NAME = 'Deleted account';
let AccountService = class AccountService {
    constructor(prisma, tokens) {
        this.prisma = prisma;
        this.tokens = tokens;
    }
    async get(parent) {
        return { parent: await (0, parent_views_1.loadParentAccount)(this.prisma, parent.id) };
    }
    async update(parent, dto) {
        const { dob } = await (0, app_auth_service_1.checkParentDetails)(this.prisma, dto);
        const current = await this.prisma.parent.findUniqueOrThrow({ where: { id: parent.id }, select: { termsAcceptedAt: true } });
        const acceptNow = dto.acceptTerms === true && !current.termsAcceptedAt;
        await this.prisma.parent.update({
            where: { id: parent.id },
            data: {
                name: dto.name,
                dob,
                phone: dto.phone,
                countryCode: dto.countryCode,
                language: dto.language,
                ...(acceptNow ? { termsAcceptedAt: new Date(), termsVersion: await (0, app_auth_service_1.currentTermsVersion)(this.prisma) } : {}),
            },
        });
        return this.get(parent);
    }
    async changePassword(parent, dto) {
        const row = await this.prisma.parent.findUniqueOrThrow({ where: { id: parent.id }, select: { passwordHash: true } });
        if (row.passwordHash) {
            if (!dto.currentPassword)
                throw new common_1.BadRequestException('Enter your current password.');
            if (!(await bcryptjs_1.default.compare(dto.currentPassword, row.passwordHash)))
                throw new common_1.BadRequestException("Your current password isn't right.");
            if (await bcryptjs_1.default.compare(dto.newPassword, row.passwordHash))
                throw new common_1.BadRequestException(app_auth_service_1.SAME_PASSWORD);
        }
        const passwordHash = await bcryptjs_1.default.hash(dto.newPassword, 10);
        await this.prisma.$transaction(async (tx) => {
            await tx.parent.update({ where: { id: parent.id }, data: { passwordHash } });
            await this.tokens.revokeAll(parent.id, parent.sessionId, tx);
        });
        return this.get(parent);
    }
    async delete(parent, dto) {
        const row = await this.prisma.parent.findUniqueOrThrow({ where: { id: parent.id }, select: { passwordHash: true } });
        if (row.passwordHash) {
            if (!dto.password)
                throw new common_1.BadRequestException('Enter your password to delete your account.');
            if (!(await bcryptjs_1.default.compare(dto.password, row.passwordHash)))
                throw new common_1.BadRequestException("That password isn't right.");
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.child.deleteMany({ where: { parentId: parent.id } });
            await tx.notification.deleteMany({ where: { parentId: parent.id } });
            await tx.favorite.deleteMany({ where: { parentId: parent.id } });
            await tx.libraryEngagement.deleteMany({ where: { parentId: parent.id } });
            await tx.passwordReset.deleteMany({ where: { parentId: parent.id } });
            await this.tokens.revokeAll(parent.id, undefined, tx);
            await tx.parent.update({
                where: { id: parent.id },
                data: {
                    name: exports.DELETED_NAME,
                    email: `deleted-${parent.id}@deleted.invalid`,
                    passwordHash: null,
                    googleId: null,
                    appleId: null,
                    dob: null,
                    phone: null,
                    countryCode: null,
                    deletedAt: new Date(),
                },
            });
        });
        return { status: 'deleted' };
    }
};
exports.AccountService = AccountService;
exports.AccountService = AccountService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        parent_tokens_service_1.ParentTokensService])
], AccountService);
//# sourceMappingURL=account.service.js.map