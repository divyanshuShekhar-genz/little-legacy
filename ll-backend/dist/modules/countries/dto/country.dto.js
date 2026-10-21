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
exports.UpdateCountryDto = exports.CreateCountryDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const json_1 = require("../../../common/utils/json");
const upper = ({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value);
const blankToNull = ({ value }) => (typeof value === 'string' ? value.trim() || null : value);
const CHARGE = 'Enter a delivery charge of 0 or more.';
class CreateCountryDto {
    constructor() {
        this.deliveryEstimate = null;
        this.enabled = true;
    }
}
exports.CreateCountryDto = CreateCountryDto;
__decorate([
    (0, class_validator_1.IsIn)(['publish', 'draft']),
    __metadata("design:type", String)
], CreateCountryDto.prototype, "mode", void 0);
__decorate([
    (0, class_transformer_1.Transform)(json_1.trim),
    (0, class_validator_1.IsString)({ message: 'Enter a country name.' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Enter a country name.' }),
    __metadata("design:type", String)
], CreateCountryDto.prototype, "name", void 0);
__decorate([
    (0, class_transformer_1.Transform)(upper),
    (0, class_validator_1.IsString)({ message: 'Use a two-letter country code.' }),
    __metadata("design:type", String)
], CreateCountryDto.prototype, "code", void 0);
__decorate([
    (0, class_transformer_1.Transform)(upper),
    (0, class_validator_1.IsString)({ message: 'Use a valid ISO 4217 currency code.' }),
    __metadata("design:type", String)
], CreateCountryDto.prototype, "currency", void 0);
__decorate([
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }, { message: CHARGE }),
    (0, class_validator_1.Min)(0, { message: CHARGE }),
    (0, class_validator_1.Max)(9_999_999_999.99, { message: CHARGE }),
    __metadata("design:type", Number)
], CreateCountryDto.prototype, "deliveryCharge", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], CreateCountryDto.prototype, "deliveryEstimate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateCountryDto.prototype, "enabled", void 0);
class UpdateCountryDto {
}
exports.UpdateCountryDto = UpdateCountryDto;
__decorate([
    (0, class_validator_1.IsIn)(['publish', 'draft']),
    __metadata("design:type", String)
], UpdateCountryDto.prototype, "mode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(json_1.trim),
    (0, class_validator_1.IsString)({ message: 'Enter a country name.' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Enter a country name.' }),
    __metadata("design:type", String)
], UpdateCountryDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(upper),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCountryDto.prototype, "code", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(upper),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCountryDto.prototype, "currency", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }, { message: CHARGE }),
    (0, class_validator_1.Min)(0, { message: CHARGE }),
    (0, class_validator_1.Max)(9_999_999_999.99, { message: CHARGE }),
    __metadata("design:type", Number)
], UpdateCountryDto.prototype, "deliveryCharge", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], UpdateCountryDto.prototype, "deliveryEstimate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateCountryDto.prototype, "enabled", void 0);
//# sourceMappingURL=country.dto.js.map