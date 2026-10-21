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
exports.CountriesController = void 0;
const common_1 = require("@nestjs/common");
const jwt_guard_1 = require("../../common/guards/jwt.guard");
const section_guard_1 = require("../../common/guards/section.guard");
const current_admin_decorator_1 = require("../../common/decorators/current-admin.decorator");
const countries_service_1 = require("./countries.service");
const country_dto_1 = require("./dto/country.dto");
let CountriesController = class CountriesController {
    constructor(countries) {
        this.countries = countries;
    }
    list() {
        return this.countries.list();
    }
    create(admin, dto) {
        return this.countries.create(admin, dto);
    }
    update(admin, code, dto) {
        return this.countries.update(admin, code, dto);
    }
};
exports.CountriesController = CountriesController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CountriesController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, country_dto_1.CreateCountryDto]),
    __metadata("design:returntype", void 0)
], CountriesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':code'),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('code')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, country_dto_1.UpdateCountryDto]),
    __metadata("design:returntype", void 0)
], CountriesController.prototype, "update", null);
exports.CountriesController = CountriesController = __decorate([
    (0, common_1.Controller)('countries'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard, section_guard_1.SectionGuard),
    __metadata("design:paramtypes", [countries_service_1.CountriesService])
], CountriesController);
//# sourceMappingURL=countries.controller.js.map