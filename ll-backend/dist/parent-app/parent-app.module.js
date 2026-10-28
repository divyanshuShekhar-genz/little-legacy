"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParentAppModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const account_controller_1 = require("./account/account.controller");
const account_service_1 = require("./account/account.service");
const app_auth_controller_1 = require("./auth/app-auth.controller");
const app_auth_service_1 = require("./auth/app-auth.service");
const social_verifier_service_1 = require("./auth/social-verifier.service");
const app_children_controller_1 = require("./children/app-children.controller");
const app_children_service_1 = require("./children/app-children.service");
const parent_auth_guard_1 = require("./common/parent-auth.guard");
const parent_tokens_service_1 = require("./common/parent-tokens.service");
const app_options_controller_1 = require("./options/app-options.controller");
let ParentAppModule = class ParentAppModule {
};
exports.ParentAppModule = ParentAppModule;
exports.ParentAppModule = ParentAppModule = __decorate([
    (0, common_1.Module)({
        imports: [jwt_1.JwtModule.register({})],
        controllers: [app_options_controller_1.AppOptionsController, app_auth_controller_1.AppAuthController, account_controller_1.AccountController, app_children_controller_1.AppChildrenController],
        providers: [parent_tokens_service_1.ParentTokensService, parent_auth_guard_1.ParentAuthGuard, social_verifier_service_1.SocialVerifierService, app_auth_service_1.AppAuthService, account_service_1.AccountService, app_children_service_1.AppChildrenService],
    })
], ParentAppModule);
//# sourceMappingURL=parent-app.module.js.map