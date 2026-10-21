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
exports.CommunityController = void 0;
const common_1 = require("@nestjs/common");
const jwt_guard_1 = require("../../common/guards/jwt.guard");
const section_guard_1 = require("../../common/guards/section.guard");
const section_decorator_1 = require("../../common/decorators/section.decorator");
const current_admin_decorator_1 = require("../../common/decorators/current-admin.decorator");
const community_service_1 = require("./community.service");
const decision_dto_1 = require("./dto/decision.dto");
const visible_limit_dto_1 = require("./dto/visible-limit.dto");
let CommunityController = class CommunityController {
    constructor(community) {
        this.community = community;
    }
    list() {
        return this.community.list();
    }
    review(admin, id, dto) {
        return this.community.review(admin, id, dto);
    }
    createTeamPost(admin, dto) {
        return this.community.saveTeamPost(admin, null, dto);
    }
    updateTeamPost(admin, id, dto) {
        return this.community.saveTeamPost(admin, id, dto);
    }
    saveVisibleLimit(admin, dto) {
        return this.community.saveVisibleLimit(admin, dto);
    }
};
exports.CommunityController = CommunityController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CommunityController.prototype, "list", null);
__decorate([
    (0, common_1.Post)('posts/:id/review'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, decision_dto_1.DecisionDto]),
    __metadata("design:returntype", void 0)
], CommunityController.prototype, "review", null);
__decorate([
    (0, common_1.Post)('team-posts'),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, decision_dto_1.TeamPostDto]),
    __metadata("design:returntype", void 0)
], CommunityController.prototype, "createTeamPost", null);
__decorate([
    (0, common_1.Patch)('team-posts/:id'),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, decision_dto_1.TeamPostDto]),
    __metadata("design:returntype", void 0)
], CommunityController.prototype, "updateTeamPost", null);
__decorate([
    (0, common_1.Put)('settings'),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, visible_limit_dto_1.VisibleLimitDto]),
    __metadata("design:returntype", void 0)
], CommunityController.prototype, "saveVisibleLimit", null);
exports.CommunityController = CommunityController = __decorate([
    (0, common_1.Controller)('community'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard, section_guard_1.SectionGuard),
    (0, section_decorator_1.RequireSection)('community'),
    __metadata("design:paramtypes", [community_service_1.CommunityService])
], CommunityController);
//# sourceMappingURL=community.controller.js.map