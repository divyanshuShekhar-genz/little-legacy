"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocialVerifierService = void 0;
const common_1 = require("@nestjs/common");
const jose_1 = require("jose");
const env_1 = require("../../common/config/env");
const PROVIDERS = {
    google: {
        jwks: 'https://www.googleapis.com/oauth2/v3/certs',
        issuers: ['https://accounts.google.com', 'accounts.google.com'],
        audiences: () => env_1.env.GOOGLE_CLIENT_IDS,
        label: 'Google',
    },
    apple: {
        jwks: 'https://appleid.apple.com/auth/keys',
        issuers: ['https://appleid.apple.com'],
        audiences: () => env_1.env.APPLE_CLIENT_IDS,
        label: 'Apple',
    },
};
const FAILED = 'Sign-in failed. Please try again.';
let SocialVerifierService = class SocialVerifierService {
    constructor() {
        this.keys = new Map();
    }
    async verify(provider, idToken) {
        const p = PROVIDERS[provider];
        const audience = p.audiences();
        if (!audience.length)
            throw new common_1.ServiceUnavailableException(`${p.label} sign-in isn't available yet.`);
        let keys = this.keys.get(provider);
        if (!keys)
            this.keys.set(provider, (keys = (0, jose_1.createRemoteJWKSet)(new URL(p.jwks))));
        let claims;
        try {
            ({ payload: claims } = await (0, jose_1.jwtVerify)(idToken, keys, { issuer: p.issuers, audience }));
        }
        catch {
            throw new common_1.UnauthorizedException(FAILED);
        }
        if (typeof claims.sub !== 'string' || !claims.sub)
            throw new common_1.UnauthorizedException(FAILED);
        const verified = claims.email_verified === true || claims.email_verified === 'true';
        const email = verified && typeof claims.email === 'string' ? claims.email.trim().toLowerCase() : null;
        const name = typeof claims.name === 'string' && claims.name.trim() ? claims.name.trim() : null;
        return { provider, subject: claims.sub, email, name };
    }
};
exports.SocialVerifierService = SocialVerifierService;
exports.SocialVerifierService = SocialVerifierService = __decorate([
    (0, common_1.Injectable)()
], SocialVerifierService);
//# sourceMappingURL=social-verifier.service.js.map