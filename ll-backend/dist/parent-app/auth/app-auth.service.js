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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppAuthService = exports.SAME_PASSWORD = void 0;
exports.checkParentDetails = checkParentDetails;
exports.currentTermsVersion = currentTermsVersion;
const node_crypto_1 = require("node:crypto");
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const env_1 = require("../../common/config/env");
const email_interface_1 = require("../../common/email/email.interface");
const rules_1 = require("../../common/rules");
const prisma_service_1 = require("../../prisma/prisma.service");
const parent_tokens_service_1 = require("../common/parent-tokens.service");
const parent_views_1 = require("../common/parent-views");
const fields_1 = require("../common/fields");
const social_verifier_service_1 = require("./social-verifier.service");
const WRONG_LOGIN = 'Email or password is incorrect.';
const TERMS = 'Please accept the terms and conditions and privacy policy.';
const WRONG_CODE = "That code isn't right or has expired.";
const RESET_EXPIRED = 'Your reset has expired. Please start again.';
exports.SAME_PASSWORD = "Choose a password you haven't used before.";
const RESEND_SECONDS = 30;
const CODE_MINUTES = 15;
const CODE_TRIES = 5;
const RESET_TOKEN_TTL = '10m';
async function checkParentDetails(prisma, d) {
    let dob;
    if (d.dob !== undefined) {
        const parsed = (0, fields_1.parseDay)(d.dob);
        if (!parsed || parsed > (0, fields_1.today)())
            throw new common_1.BadRequestException('Enter your date of birth.');
        if (!(0, rules_1.isAdult)(parsed, (0, fields_1.today)()))
            throw new common_1.BadRequestException('You must be 18 or over to create an account.');
        dob = parsed;
    }
    if (d.countryCode !== undefined && !(await prisma.country.count({ where: { code: d.countryCode, enabled: true } }))) {
        throw new common_1.BadRequestException('Choose your country.');
    }
    return { dob };
}
async function currentTermsVersion(prisma) {
    return (await prisma.appContentVersion.findFirst({ orderBy: { version: 'desc' }, select: { version: true } }))?.version ?? null;
}
let AppAuthService = class AppAuthService {
    constructor(prisma, tokens, jwt, social, email) {
        this.prisma = prisma;
        this.tokens = tokens;
        this.jwt = jwt;
        this.social = social;
        this.email = email;
    }
    async register(dto) {
        if (dto.acceptTerms !== true)
            throw new common_1.BadRequestException(TERMS);
        const { dob } = await checkParentDetails(this.prisma, dto);
        if (await this.prisma.parent.count({ where: { email: dto.email } })) {
            throw new common_1.ConflictException('An account with this email already exists. Sign in instead.');
        }
        const passwordHash = await bcryptjs_1.default.hash(dto.password, 10);
        const termsVersion = await currentTermsVersion(this.prisma);
        return this.prisma.$transaction(async (tx) => {
            const parent = await tx.parent.create({
                data: {
                    name: dto.name,
                    email: dto.email,
                    passwordHash,
                    dob,
                    phone: dto.phone,
                    countryCode: dto.countryCode ?? null,
                    language: dto.language ?? 'en',
                    termsAcceptedAt: new Date(),
                    termsVersion,
                },
            });
            return { ...(await this.tokens.start(parent.id, tx)), parent: await (0, parent_views_1.loadParentAccount)(tx, parent.id) };
        });
    }
    async login(dto) {
        const parent = await this.prisma.parent.findFirst({ where: { email: dto.email, deletedAt: null } });
        if (!parent?.passwordHash || !(await bcryptjs_1.default.compare(dto.password, parent.passwordHash)))
            throw new common_1.UnauthorizedException(WRONG_LOGIN);
        return this.signIn(parent.id);
    }
    async socialLogin(provider, dto) {
        const who = await this.social.verify(provider, dto.idToken);
        const idField = provider === 'google' ? 'googleId' : 'appleId';
        const label = provider === 'google' ? 'Google' : 'Apple';
        const known = await this.prisma.parent.findFirst({ where: { [idField]: who.subject, deletedAt: null } });
        if (known)
            return { ...(await this.signIn(known.id)), isNewAccount: false };
        if (!who.email)
            throw new common_1.BadRequestException(`We couldn't get your email address from ${label}. Please sign up with your email instead.`);
        const sameEmail = await this.prisma.parent.findFirst({ where: { email: who.email, deletedAt: null } });
        if (sameEmail) {
            if (sameEmail[idField])
                throw new common_1.ConflictException(`This email is already linked to another ${label} account.`);
            await this.prisma.parent.update({ where: { id: sameEmail.id }, data: { [idField]: who.subject } });
            return { ...(await this.signIn(sameEmail.id)), isNewAccount: false };
        }
        const name = (who.name ?? dto.name ?? who.email.split('@')[0]).slice(0, 80);
        return this.prisma.$transaction(async (tx) => {
            const parent = await tx.parent.create({ data: { name, email: who.email, [idField]: who.subject } });
            return { ...(await this.tokens.start(parent.id, tx)), parent: await (0, parent_views_1.loadParentAccount)(tx, parent.id), isNewAccount: true };
        });
    }
    refresh(refreshToken) {
        return this.tokens.refresh(refreshToken);
    }
    async logout(sessionId) {
        await this.tokens.revoke(sessionId);
        return { status: 'signed-out' };
    }
    async forgotPassword(dto) {
        const answer = { resendAfter: RESEND_SECONDS };
        const parent = await this.prisma.parent.findFirst({ where: { email: dto.email, deletedAt: null }, select: { id: true, email: true } });
        if (!parent)
            return answer;
        const last = await this.prisma.passwordReset.findFirst({ where: { parentId: parent.id }, orderBy: { createdAt: 'desc' } });
        if (last && Date.now() - last.createdAt.getTime() < RESEND_SECONDS * 1000)
            return answer;
        const code = String((0, node_crypto_1.randomInt)(0, 1_000_000)).padStart(6, '0');
        await this.prisma.$transaction([
            this.prisma.passwordReset.updateMany({ where: { parentId: parent.id, usedAt: null }, data: { usedAt: new Date() } }),
            this.prisma.passwordReset.create({ data: { parentId: parent.id, codeHash: (0, parent_tokens_service_1.sha256)(code), expiresAt: new Date(Date.now() + CODE_MINUTES * 60_000) } }),
        ]);
        await this.email.send({
            to: parent.email,
            subject: 'Your Little Legacy code',
            text: `Your code is ${code}. It works for ${CODE_MINUTES} minutes.\n\nIf you didn't ask to reset your password, you can ignore this email.`,
        });
        return answer;
    }
    async verifyCode(dto) {
        const parent = await this.prisma.parent.findFirst({ where: { email: dto.email, deletedAt: null }, select: { id: true } });
        const reset = parent
            ? await this.prisma.passwordReset.findFirst({ where: { parentId: parent.id, usedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } })
            : null;
        if (!reset)
            throw new common_1.BadRequestException(WRONG_CODE);
        if (reset.attempts >= CODE_TRIES)
            throw new common_1.BadRequestException('Too many tries. Ask for a new code.');
        if (reset.codeHash !== (0, parent_tokens_service_1.sha256)(dto.code)) {
            await this.prisma.passwordReset.update({ where: { id: reset.id }, data: { attempts: { increment: 1 } } });
            throw new common_1.BadRequestException(WRONG_CODE);
        }
        await this.prisma.passwordReset.update({ where: { id: reset.id }, data: { verifiedAt: new Date() } });
        const claims = { sub: parent.id, rid: reset.id, typ: 'reset' };
        return { resetToken: await this.jwt.signAsync(claims, { secret: env_1.env.PARENT_JWT_SECRET, expiresIn: RESET_TOKEN_TTL }) };
    }
    async resetPassword(dto) {
        let claims;
        try {
            claims = await this.jwt.verifyAsync(dto.resetToken, { secret: env_1.env.PARENT_JWT_SECRET });
        }
        catch {
            throw new common_1.BadRequestException(RESET_EXPIRED);
        }
        if (claims.typ !== 'reset')
            throw new common_1.BadRequestException(RESET_EXPIRED);
        const parent = await this.prisma.parent.findFirst({ where: { id: claims.sub, deletedAt: null } });
        if (!parent)
            throw new common_1.BadRequestException(RESET_EXPIRED);
        if (parent.passwordHash && (await bcryptjs_1.default.compare(dto.password, parent.passwordHash)))
            throw new common_1.BadRequestException(exports.SAME_PASSWORD);
        const passwordHash = await bcryptjs_1.default.hash(dto.password, 10);
        return this.prisma.$transaction(async (tx) => {
            const used = await tx.passwordReset.updateMany({
                where: { id: claims.rid, parentId: parent.id, verifiedAt: { not: null }, usedAt: null },
                data: { usedAt: new Date() },
            });
            if (used.count !== 1)
                throw new common_1.BadRequestException(RESET_EXPIRED);
            await tx.parent.update({ where: { id: parent.id }, data: { passwordHash } });
            await this.tokens.revokeAll(parent.id, undefined, tx);
            return { ...(await this.tokens.start(parent.id, tx)), parent: await (0, parent_views_1.loadParentAccount)(tx, parent.id) };
        });
    }
    async signIn(parentId) {
        return { ...(await this.tokens.start(parentId)), parent: await (0, parent_views_1.loadParentAccount)(this.prisma, parentId) };
    }
};
exports.AppAuthService = AppAuthService;
exports.AppAuthService = AppAuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(4, (0, common_1.Inject)(email_interface_1.EMAIL)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        parent_tokens_service_1.ParentTokensService,
        jwt_1.JwtService,
        social_verifier_service_1.SocialVerifierService, Object])
], AppAuthService);
//# sourceMappingURL=app-auth.service.js.map