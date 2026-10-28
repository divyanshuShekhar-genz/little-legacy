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
exports.ParentTokensService = exports.sha256 = exports.SESSION_ENDED = void 0;
const node_crypto_1 = require("node:crypto");
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const env_1 = require("../../common/config/env");
const prisma_service_1 = require("../../prisma/prisma.service");
exports.SESSION_ENDED = 'Your session has ended. Please sign in again.';
const DAY = 24 * 60 * 60_000;
const sha256 = (s) => (0, node_crypto_1.createHash)('sha256').update(s).digest('hex');
exports.sha256 = sha256;
let ParentTokensService = class ParentTokensService {
    constructor(prisma, jwt) {
        this.prisma = prisma;
        this.jwt = jwt;
    }
    async start(parentId, db = this.prisma) {
        const secret = (0, node_crypto_1.randomBytes)(32).toString('base64url');
        const session = await db.parentSession.create({
            data: { parentId, tokenHash: (0, exports.sha256)(secret), expiresAt: new Date(Date.now() + env_1.env.PARENT_REFRESH_DAYS * DAY) },
        });
        return this.pair(parentId, session.id, secret);
    }
    async refresh(refreshToken) {
        const [sessionId, secret] = refreshToken.split('.');
        if (!sessionId || !secret)
            throw new common_1.UnauthorizedException(exports.SESSION_ENDED);
        const now = new Date();
        const next = (0, node_crypto_1.randomBytes)(32).toString('base64url');
        const rotated = await this.prisma.parentSession.updateMany({
            where: { id: sessionId, tokenHash: (0, exports.sha256)(secret), revokedAt: null, expiresAt: { gt: now }, parent: { deletedAt: null } },
            data: { tokenHash: (0, exports.sha256)(next), lastUsedAt: now, expiresAt: new Date(now.getTime() + env_1.env.PARENT_REFRESH_DAYS * DAY) },
        });
        if (rotated.count !== 1) {
            await this.prisma.parentSession.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: now } });
            throw new common_1.UnauthorizedException(exports.SESSION_ENDED);
        }
        const { parentId } = await this.prisma.parentSession.findUniqueOrThrow({ where: { id: sessionId }, select: { parentId: true } });
        return this.pair(parentId, sessionId, next);
    }
    revoke(sessionId, db = this.prisma) {
        return db.parentSession.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
    }
    revokeAll(parentId, keepSessionId, db = this.prisma) {
        return db.parentSession.updateMany({
            where: { parentId, revokedAt: null, ...(keepSessionId ? { id: { not: keepSessionId } } : {}) },
            data: { revokedAt: new Date() },
        });
    }
    async pair(parentId, sessionId, secret) {
        const claims = { sub: parentId, sid: sessionId, typ: 'parent' };
        const accessToken = await this.jwt.signAsync(claims, { secret: env_1.env.PARENT_JWT_SECRET, expiresIn: env_1.env.PARENT_ACCESS_EXPIRES_IN });
        const { exp, iat } = this.jwt.decode(accessToken);
        return { accessToken, refreshToken: `${sessionId}.${secret}`, expiresIn: exp - iat };
    }
};
exports.ParentTokensService = ParentTokensService;
exports.ParentTokensService = ParentTokensService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], ParentTokensService);
//# sourceMappingURL=parent-tokens.service.js.map