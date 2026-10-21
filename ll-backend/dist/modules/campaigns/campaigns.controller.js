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
exports.NotificationsController = exports.CampaignsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_guard_1 = require("../../common/guards/jwt.guard");
const section_guard_1 = require("../../common/guards/section.guard");
const section_decorator_1 = require("../../common/decorators/section.decorator");
const current_admin_decorator_1 = require("../../common/decorators/current-admin.decorator");
const campaigns_service_1 = require("./campaigns.service");
const campaign_dto_1 = require("./dto/campaign.dto");
let CampaignsController = class CampaignsController {
    constructor(campaigns) {
        this.campaigns = campaigns;
    }
    list(admin) {
        return this.campaigns.list(admin);
    }
    audience(dto) {
        return this.campaigns.audience(dto);
    }
    save(admin, dto) {
        return this.campaigns.save(admin, dto);
    }
};
exports.CampaignsController = CampaignsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CampaignsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)('audience'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [campaign_dto_1.AudienceDto]),
    __metadata("design:returntype", void 0)
], CampaignsController.prototype, "audience", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, campaign_dto_1.SaveCampaignDto]),
    __metadata("design:returntype", void 0)
], CampaignsController.prototype, "save", null);
exports.CampaignsController = CampaignsController = __decorate([
    (0, common_1.Controller)('campaigns'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard, section_guard_1.SectionGuard),
    (0, section_decorator_1.RequireSection)('notifications'),
    __metadata("design:paramtypes", [campaigns_service_1.CampaignsService])
], CampaignsController);
let NotificationsController = class NotificationsController {
    constructor(campaigns) {
        this.campaigns = campaigns;
    }
    reminders() {
        return this.campaigns.reminders();
    }
};
exports.NotificationsController = NotificationsController;
__decorate([
    (0, common_1.Get)('reminders'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "reminders", null);
exports.NotificationsController = NotificationsController = __decorate([
    (0, common_1.Controller)('notifications'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard, section_guard_1.SectionGuard),
    (0, section_decorator_1.RequireSection)('notifications'),
    __metadata("design:paramtypes", [campaigns_service_1.CampaignsService])
], NotificationsController);
//# sourceMappingURL=campaigns.controller.js.map