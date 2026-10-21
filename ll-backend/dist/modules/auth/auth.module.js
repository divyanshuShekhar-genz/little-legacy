"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const passport_1 = require("@nestjs/passport");
const throttler_1 = require("@nestjs/throttler");
const env_1 = require("../../common/config/env");
const jwt_strategy_1 = require("../../common/strategies/jwt.strategy");
const auth_controller_1 = require("./auth.controller");
const auth_service_1 = require("./auth.service");
const FIFTEEN_MINUTES = 15 * 60_000;
const loginEmail = (req) => typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            passport_1.PassportModule.register({ defaultStrategy: 'jwt' }),
            jwt_1.JwtModule.register({ secret: env_1.env.JWT_SECRET }),
            throttler_1.ThrottlerModule.forRoot({
                errorMessage: 'Too many sign-in attempts. Try again in a few minutes.',
                throttlers: [
                    { name: 'loginAccount', ttl: FIFTEEN_MINUTES, limit: 5, getTracker: (req) => `${req.ip}:${loginEmail(req)}` },
                    { name: 'loginAddress', ttl: FIFTEEN_MINUTES, limit: 30 },
                ],
            }),
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [auth_service_1.AuthService, jwt_strategy_1.JwtStrategy],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map