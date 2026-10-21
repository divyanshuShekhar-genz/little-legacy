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
exports.AgeGroupsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_guard_1 = require("../../common/guards/jwt.guard");
const section_guard_1 = require("../../common/guards/section.guard");
const section_decorator_1 = require("../../common/decorators/section.decorator");
const current_admin_decorator_1 = require("../../common/decorators/current-admin.decorator");
const area_dto_1 = require("../areas/dto/area.dto");
const age_groups_service_1 = require("./age-groups.service");
const age_group_dto_1 = require("./dto/age-group.dto");
let AgeGroupsController = class AgeGroupsController {
    constructor(ageGroups) {
        this.ageGroups = ageGroups;
    }
    list(query) {
        return this.ageGroups.list(query.regionId);
    }
    create(admin, dto) {
        return this.ageGroups.create(admin, dto);
    }
};
exports.AgeGroupsController = AgeGroupsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [area_dto_1.RegionQueryDto]),
    __metadata("design:returntype", void 0)
], AgeGroupsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    (0, section_decorator_1.RequireSection)('developmentalMilestones'),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, age_group_dto_1.CreateAgeGroupDto]),
    __metadata("design:returntype", void 0)
], AgeGroupsController.prototype, "create", null);
exports.AgeGroupsController = AgeGroupsController = __decorate([
    (0, common_1.Controller)('age-groups'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard, section_guard_1.SectionGuard),
    __metadata("design:paramtypes", [age_groups_service_1.AgeGroupsService])
], AgeGroupsController);
//# sourceMappingURL=age-groups.controller.js.map