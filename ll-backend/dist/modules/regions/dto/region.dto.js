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
exports.RegionExportQueryDto = exports.DeleteRegionDto = exports.UpdateRegionDto = exports.CreateRegionDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const collapse = ({ value }) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value);
const NAME = 'Enter a category name.';
const CODES = 'Use two-letter country codes.';
class CreateRegionDto {
    constructor() {
        this.countryCodes = [];
        this.active = false;
    }
}
exports.CreateRegionDto = CreateRegionDto;
__decorate([
    (0, class_validator_1.IsIn)(['publish', 'draft']),
    __metadata("design:type", String)
], CreateRegionDto.prototype, "mode", void 0);
__decorate([
    (0, class_transformer_1.Transform)(collapse),
    (0, class_validator_1.IsString)({ message: NAME }),
    (0, class_validator_1.IsNotEmpty)({ message: NAME }),
    __metadata("design:type", String)
], CreateRegionDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)({ message: CODES }),
    (0, class_validator_1.IsString)({ each: true, message: CODES }),
    __metadata("design:type", Array)
], CreateRegionDto.prototype, "countryCodes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateRegionDto.prototype, "active", void 0);
class UpdateRegionDto {
}
exports.UpdateRegionDto = UpdateRegionDto;
__decorate([
    (0, class_validator_1.IsIn)(['publish', 'draft']),
    __metadata("design:type", String)
], UpdateRegionDto.prototype, "mode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(collapse),
    (0, class_validator_1.IsString)({ message: NAME }),
    (0, class_validator_1.IsNotEmpty)({ message: NAME }),
    __metadata("design:type", String)
], UpdateRegionDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)({ message: CODES }),
    (0, class_validator_1.IsString)({ each: true, message: CODES }),
    __metadata("design:type", Array)
], UpdateRegionDto.prototype, "countryCodes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateRegionDto.prototype, "isDefault", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateRegionDto.prototype, "active", void 0);
class DeleteRegionDto {
}
exports.DeleteRegionDto = DeleteRegionDto;
__decorate([
    (0, class_validator_1.IsIn)(['publish', 'draft']),
    __metadata("design:type", String)
], DeleteRegionDto.prototype, "mode", void 0);
class RegionExportQueryDto {
}
exports.RegionExportQueryDto = RegionExportQueryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => (typeof value === 'string' ? value.trim() || undefined : value)),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegionExportQueryDto.prototype, "regionId", void 0);
//# sourceMappingURL=region.dto.js.map