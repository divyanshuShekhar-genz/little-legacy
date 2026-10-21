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
exports.CountryPricesController = exports.PlansController = void 0;
const common_1 = require("@nestjs/common");
const jwt_guard_1 = require("../../common/guards/jwt.guard");
const section_guard_1 = require("../../common/guards/section.guard");
const section_decorator_1 = require("../../common/decorators/section.decorator");
const current_admin_decorator_1 = require("../../common/decorators/current-admin.decorator");
const plans_service_1 = require("./plans.service");
const plan_dto_1 = require("./dto/plan.dto");
let PlansController = class PlansController {
    constructor(plans) {
        this.plans = plans;
    }
    list(admin) {
        return this.plans.list(admin);
    }
    update(admin, tier, dto) {
        return this.plans.update(admin, tier, dto);
    }
};
exports.PlansController = PlansController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PlansController.prototype, "list", null);
__decorate([
    (0, common_1.Patch)(':tier'),
    (0, section_decorator_1.RequireSection)('subscriptions'),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('tier')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, plan_dto_1.UpdatePlanDto]),
    __metadata("design:returntype", void 0)
], PlansController.prototype, "update", null);
exports.PlansController = PlansController = __decorate([
    (0, common_1.Controller)('plans'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard, section_guard_1.SectionGuard),
    __metadata("design:paramtypes", [plans_service_1.PlansService])
], PlansController);
let CountryPricesController = class CountryPricesController {
    constructor(plans) {
        this.plans = plans;
    }
    save(admin, code, dto) {
        return this.plans.countryPrices(admin, code, dto);
    }
};
exports.CountryPricesController = CountryPricesController;
__decorate([
    (0, common_1.Put)(':code/prices'),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('code')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, plan_dto_1.CountryPricesDto]),
    __metadata("design:returntype", void 0)
], CountryPricesController.prototype, "save", null);
exports.CountryPricesController = CountryPricesController = __decorate([
    (0, common_1.Controller)('countries'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard, section_guard_1.SectionGuard),
    __metadata("design:paramtypes", [plans_service_1.PlansService])
], CountryPricesController);
//# sourceMappingURL=plans.controller.js.map