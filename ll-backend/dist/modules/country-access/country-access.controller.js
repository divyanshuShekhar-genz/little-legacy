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
exports.CountryAccessController = void 0;
const common_1 = require("@nestjs/common");
const jwt_guard_1 = require("../../common/guards/jwt.guard");
const current_admin_decorator_1 = require("../../common/decorators/current-admin.decorator");
const rules_1 = require("../../common/rules");
const country_access_service_1 = require("./country-access.service");
const restriction_dto_1 = require("./dto/restriction.dto");
let CountryAccessController = class CountryAccessController {
    constructor(countryAccess) {
        this.countryAccess = countryAccess;
    }
    list(admin, types) {
        const requested = (types ?? '').split(',').filter((t) => rules_1.RESTRICTION_TYPE_KEYS.includes(t));
        return this.countryAccess.list(admin, requested);
    }
    preview(country) {
        return this.countryAccess.preview(country ? country.toUpperCase() : null);
    }
    exportRules(admin) {
        return this.countryAccess.exportRules(admin);
    }
    create(admin, dto) {
        return this.countryAccess.create(admin, dto);
    }
    update(admin, id, dto) {
        return this.countryAccess.update(admin, id, dto);
    }
    remove(admin, id, dto) {
        return this.countryAccess.remove(admin, id, dto);
    }
};
exports.CountryAccessController = CountryAccessController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Query)('types')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CountryAccessController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('preview'),
    __param(0, (0, common_1.Query)('country')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CountryAccessController.prototype, "preview", null);
__decorate([
    (0, common_1.Get)('export'),
    (0, common_1.Header)('Content-Disposition', 'attachment; filename="little-legacy-country-access.json"'),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CountryAccessController.prototype, "exportRules", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, restriction_dto_1.RestrictionDto]),
    __metadata("design:returntype", void 0)
], CountryAccessController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, restriction_dto_1.RestrictionDto]),
    __metadata("design:returntype", void 0)
], CountryAccessController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, restriction_dto_1.DeleteRestrictionDto]),
    __metadata("design:returntype", void 0)
], CountryAccessController.prototype, "remove", null);
exports.CountryAccessController = CountryAccessController = __decorate([
    (0, common_1.Controller)('country-access'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [country_access_service_1.CountryAccessService])
], CountryAccessController);
//# sourceMappingURL=country-access.controller.js.map