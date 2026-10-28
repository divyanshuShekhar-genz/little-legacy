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
exports.ParentAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const env_1 = require("../../common/config/env");
const prisma_service_1 = require("../../prisma/prisma.service");
const SIGN_IN = 'Sign in to continue';
let ParentAuthGuard = class ParentAuthGuard {
    constructor(jwt, prisma) {
        this.jwt = jwt;
        this.prisma = prisma;
    }
    async canActivate(ctx) {
        const req = ctx.switchToHttp().getRequest();
        const [scheme, token] = (req.headers.authorization ?? '').split(' ');
        if (scheme !== 'Bearer' || !token)
            throw new common_1.UnauthorizedException(SIGN_IN);
        let claims;
        try {
            claims = await this.jwt.verifyAsync(token, { secret: env_1.env.PARENT_JWT_SECRET });
        }
        catch {
            throw new common_1.UnauthorizedException(SIGN_IN);
        }
        if (claims.typ !== 'parent')
            throw new common_1.UnauthorizedException(SIGN_IN);
        const live = await this.prisma.parentSession.count({
            where: { id: claims.sid, parentId: claims.sub, revokedAt: null, expiresAt: { gt: new Date() }, parent: { deletedAt: null } },
        });
        if (!live)
            throw new common_1.UnauthorizedException(SIGN_IN);
        req.parent = { id: claims.sub, sessionId: claims.sid };
        return true;
    }
};
exports.ParentAuthGuard = ParentAuthGuard;
exports.ParentAuthGuard = ParentAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        prisma_service_1.PrismaService])
], ParentAuthGuard);
//# sourceMappingURL=parent-auth.guard.js.map