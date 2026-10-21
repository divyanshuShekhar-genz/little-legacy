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
exports.RegionsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_guard_1 = require("../../common/guards/jwt.guard");
const section_guard_1 = require("../../common/guards/section.guard");
const section_decorator_1 = require("../../common/decorators/section.decorator");
const current_admin_decorator_1 = require("../../common/decorators/current-admin.decorator");
const regions_service_1 = require("./regions.service");
const regional_export_service_1 = require("./regional-export.service");
const region_dto_1 = require("./dto/region.dto");
let RegionsController = class RegionsController {
    constructor(regions, regionalExport) {
        this.regions = regions;
        this.regionalExport = regionalExport;
    }
    list() {
        return this.regions.list();
    }
    export(admin, query) {
        return this.regionalExport.export(admin, query.regionId);
    }
    create(admin, dto) {
        return this.regions.create(admin, dto);
    }
    update(admin, id, dto) {
        return this.regions.update(admin, id, dto);
    }
    remove(admin, id, dto) {
        return this.regions.remove(admin, id, dto);
    }
};
exports.RegionsController = RegionsController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], RegionsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('export'),
    (0, section_decorator_1.RequireSection)('superAdmin'),
    (0, common_1.Header)('Content-Disposition', 'attachment; filename="little-legacy-regional-learning.json"'),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, region_dto_1.RegionExportQueryDto]),
    __metadata("design:returntype", void 0)
], RegionsController.prototype, "export", null);
__decorate([
    (0, common_1.Post)(),
    (0, section_decorator_1.RequireSection)('superAdmin'),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, region_dto_1.CreateRegionDto]),
    __metadata("design:returntype", void 0)
], RegionsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, section_decorator_1.RequireSection)('superAdmin'),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, region_dto_1.UpdateRegionDto]),
    __metadata("design:returntype", void 0)
], RegionsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, section_decorator_1.RequireSection)('superAdmin'),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, region_dto_1.DeleteRegionDto]),
    __metadata("design:returntype", void 0)
], RegionsController.prototype, "remove", null);
exports.RegionsController = RegionsController = __decorate([
    (0, common_1.Controller)('regions'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard, section_guard_1.SectionGuard),
    __metadata("design:paramtypes", [regions_service_1.RegionsService,
        regional_export_service_1.RegionalExportService])
], RegionsController);
//# sourceMappingURL=regions.controller.js.map