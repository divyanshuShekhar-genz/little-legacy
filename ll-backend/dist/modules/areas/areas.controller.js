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
exports.AreasController = void 0;
const common_1 = require("@nestjs/common");
const jwt_guard_1 = require("../../common/guards/jwt.guard");
const section_guard_1 = require("../../common/guards/section.guard");
const section_decorator_1 = require("../../common/decorators/section.decorator");
const current_admin_decorator_1 = require("../../common/decorators/current-admin.decorator");
const areas_service_1 = require("./areas.service");
const area_dto_1 = require("./dto/area.dto");
let AreasController = class AreasController {
    constructor(areas) {
        this.areas = areas;
    }
    list(query) {
        return this.areas.list(query.regionId);
    }
    create(admin, dto) {
        return this.areas.create(admin, dto);
    }
    update(admin, id, dto) {
        return this.areas.update(admin, id, dto);
    }
    remove(admin, id, dto) {
        return this.areas.remove(admin, id, dto);
    }
};
exports.AreasController = AreasController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [area_dto_1.RegionQueryDto]),
    __metadata("design:returntype", void 0)
], AreasController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    (0, section_decorator_1.RequireSection)('developmentalMilestones'),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, area_dto_1.CreateAreaDto]),
    __metadata("design:returntype", void 0)
], AreasController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, section_decorator_1.RequireSection)('developmentalMilestones'),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, area_dto_1.UpdateAreaDto]),
    __metadata("design:returntype", void 0)
], AreasController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, section_decorator_1.RequireSection)('developmentalMilestones'),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, area_dto_1.DeleteAreaDto]),
    __metadata("design:returntype", void 0)
], AreasController.prototype, "remove", null);
exports.AreasController = AreasController = __decorate([
    (0, common_1.Controller)('areas'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard, section_guard_1.SectionGuard),
    __metadata("design:paramtypes", [areas_service_1.AreasService])
], AreasController);
//# sourceMappingURL=areas.controller.js.map