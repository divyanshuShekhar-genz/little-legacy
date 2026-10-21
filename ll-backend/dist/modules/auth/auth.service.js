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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const env_1 = require("../../common/config/env");
const prisma_service_1 = require("../../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const session_admin_1 = require("../../common/types/session-admin");
let AuthService = class AuthService {
    constructor(prisma, jwt, audit) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.audit = audit;
    }
    async login({ email, password, remember = false }) {
        const admin = await this.prisma.adminUser.findUnique({ where: { email: email.toLowerCase() } });
        if (!admin || !admin.active || !(await bcryptjs_1.default.compare(password, admin.passwordHash))) {
            throw new common_1.UnauthorizedException('Email or password is incorrect');
        }
        const session = (0, session_admin_1.toSessionAdmin)(admin);
        await this.audit.write(session, { action: 'Signed in' });
        const expiresIn = remember ? env_1.env.JWT_REMEMBER_EXPIRES_IN : env_1.env.JWT_EXPIRES_IN;
        const token = await this.jwt.signAsync({ sub: admin.id }, { expiresIn: expiresIn });
        return { token, admin: session };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        audit_service_1.AuditService])
], AuthService);
//# sourceMappingURL=auth.service.js.map