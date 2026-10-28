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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppAuthController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const current_parent_decorator_1 = require("../common/current-parent.decorator");
const parent_auth_guard_1 = require("../common/parent-auth.guard");
const app_auth_service_1 = require("./app-auth.service");
const app_auth_dto_1 = require("./dto/app-auth.dto");
let AppAuthController = class AppAuthController {
    constructor(auth) {
        this.auth = auth;
    }
    register(dto) {
        return this.auth.register(dto);
    }
    login(dto) {
        return this.auth.login(dto);
    }
    google(dto) {
        return this.auth.socialLogin('google', dto);
    }
    apple(dto) {
        return this.auth.socialLogin('apple', dto);
    }
    refresh(dto) {
        return this.auth.refresh(dto.refreshToken);
    }
    logout(parent) {
        return this.auth.logout(parent.sessionId);
    }
    forgotPassword(dto) {
        return this.auth.forgotPassword(dto);
    }
    verifyCode(dto) {
        return this.auth.verifyCode(dto);
    }
    resetPassword(dto) {
        return this.auth.resetPassword(dto);
    }
};
exports.AppAuthController = AppAuthController;
__decorate([
    (0, common_1.Post)('register'),
    (0, common_1.UseGuards)(throttler_1.ThrottlerGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [app_auth_dto_1.RegisterDto]),
    __metadata("design:returntype", void 0)
], AppAuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(200),
    (0, common_1.UseGuards)(throttler_1.ThrottlerGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [app_auth_dto_1.AppLoginDto]),
    __metadata("design:returntype", void 0)
], AppAuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('google'),
    (0, common_1.HttpCode)(200),
    (0, common_1.UseGuards)(throttler_1.ThrottlerGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [app_auth_dto_1.SocialLoginDto]),
    __metadata("design:returntype", void 0)
], AppAuthController.prototype, "google", null);
__decorate([
    (0, common_1.Post)('apple'),
    (0, common_1.HttpCode)(200),
    (0, common_1.UseGuards)(throttler_1.ThrottlerGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [app_auth_dto_1.SocialLoginDto]),
    __metadata("design:returntype", void 0)
], AppAuthController.prototype, "apple", null);
__decorate([
    (0, common_1.Post)('refresh'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [app_auth_dto_1.RefreshDto]),
    __metadata("design:returntype", void 0)
], AppAuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.HttpCode)(200),
    (0, common_1.UseGuards)(parent_auth_guard_1.ParentAuthGuard),
    __param(0, (0, current_parent_decorator_1.CurrentParent)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AppAuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Post)('forgot-password'),
    (0, common_1.HttpCode)(200),
    (0, common_1.UseGuards)(throttler_1.ThrottlerGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [app_auth_dto_1.ForgotPasswordDto]),
    __metadata("design:returntype", void 0)
], AppAuthController.prototype, "forgotPassword", null);
__decorate([
    (0, common_1.Post)('verify-code'),
    (0, common_1.HttpCode)(200),
    (0, common_1.UseGuards)(throttler_1.ThrottlerGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [app_auth_dto_1.VerifyCodeDto]),
    __metadata("design:returntype", void 0)
], AppAuthController.prototype, "verifyCode", null);
__decorate([
    (0, common_1.Post)('reset-password'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [app_auth_dto_1.ResetPasswordDto]),
    __metadata("design:returntype", void 0)
], AppAuthController.prototype, "resetPassword", null);
exports.AppAuthController = AppAuthController = __decorate([
    (0, common_1.Controller)('app/auth'),
    __metadata("design:paramtypes", [app_auth_service_1.AppAuthService])
], AppAuthController);
//# sourceMappingURL=app-auth.controller.js.map