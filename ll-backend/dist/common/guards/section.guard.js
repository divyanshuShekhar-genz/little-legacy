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
exports.SectionGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const section_decorator_1 = require("../decorators/section.decorator");
const session_admin_1 = require("../types/session-admin");
let SectionGuard = class SectionGuard {
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(context) {
        const section = this.reflector.getAllAndOverride(section_decorator_1.SECTION_KEY, [context.getHandler(), context.getClass()]);
        const admin = context.switchToHttp().getRequest().user;
        if (!admin)
            throw new common_1.UnauthorizedException();
        if (!section || (0, session_admin_1.isSuperAdmin)(admin))
            return true;
        if (section !== 'superAdmin' && admin.permissions.includes(section))
            return true;
        throw new common_1.ForbiddenException('You do not have access to this section');
    }
};
exports.SectionGuard = SectionGuard;
exports.SectionGuard = SectionGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], SectionGuard);
//# sourceMappingURL=section.guard.js.map