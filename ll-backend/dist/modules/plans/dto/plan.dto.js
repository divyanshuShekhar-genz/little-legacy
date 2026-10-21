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
exports.CountryPricesDto = exports.UpdatePlanDto = void 0;
const class_validator_1 = require("class-validator");
const MEMORY = 'Use a whole number or Unlimited for memory items.';
class UpdatePlanDto {
}
exports.UpdatePlanDto = UpdatePlanDto;
__decorate([
    (0, class_validator_1.IsIn)(['publish', 'draft']),
    __metadata("design:type", String)
], UpdatePlanDto.prototype, "mode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdatePlanDto.prototype, "active", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)({ message: MEMORY }),
    (0, class_validator_1.Min)(0, { message: MEMORY }),
    (0, class_validator_1.Max)(2_147_483_647, { message: MEMORY }),
    __metadata("design:type", Object)
], UpdatePlanDto.prototype, "memoryLimit", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)({ message: 'Enter a non-negative price.' }),
    __metadata("design:type", Object)
], UpdatePlanDto.prototype, "prices", void 0);
class CountryPricesDto {
}
exports.CountryPricesDto = CountryPricesDto;
__decorate([
    (0, class_validator_1.IsIn)(['publish', 'draft']),
    __metadata("design:type", String)
], CountryPricesDto.prototype, "mode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)({ message: 'Enter prices of zero or more.' }),
    __metadata("design:type", Object)
], CountryPricesDto.prototype, "plans", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)({ message: 'Enter prices of zero or more.' }),
    __metadata("design:type", Object)
], CountryPricesDto.prototype, "products", void 0);
//# sourceMappingURL=plan.dto.js.map