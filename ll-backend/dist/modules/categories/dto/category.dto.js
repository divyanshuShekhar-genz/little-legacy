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
exports.DeleteCategoryDto = exports.UpdateCategoryDto = exports.CreateCategoryDto = exports.AreaQueryDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const json_1 = require("../../../common/utils/json");
const collapse = ({ value }) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value);
const blankToNull = ({ value }) => (typeof value === 'string' ? value.trim() || null : value);
const NAME = 'Enter a category name.';
const AREA = 'Choose a development area.';
class AreaQueryDto {
}
exports.AreaQueryDto = AreaQueryDto;
__decorate([
    (0, class_transformer_1.Transform)(json_1.trim),
    (0, class_validator_1.IsString)({ message: AREA }),
    (0, class_validator_1.IsNotEmpty)({ message: AREA }),
    __metadata("design:type", String)
], AreaQueryDto.prototype, "areaId", void 0);
class CreateCategoryDto {
    constructor() {
        this.description = null;
    }
}
exports.CreateCategoryDto = CreateCategoryDto;
__decorate([
    (0, class_validator_1.IsIn)(['publish', 'draft']),
    __metadata("design:type", String)
], CreateCategoryDto.prototype, "mode", void 0);
__decorate([
    (0, class_transformer_1.Transform)(json_1.trim),
    (0, class_validator_1.IsString)({ message: AREA }),
    (0, class_validator_1.IsNotEmpty)({ message: AREA }),
    __metadata("design:type", String)
], CreateCategoryDto.prototype, "areaId", void 0);
__decorate([
    (0, class_transformer_1.Transform)(collapse),
    (0, class_validator_1.IsString)({ message: NAME }),
    (0, class_validator_1.IsNotEmpty)({ message: NAME }),
    __metadata("design:type", String)
], CreateCategoryDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], CreateCategoryDto.prototype, "description", void 0);
class UpdateCategoryDto {
}
exports.UpdateCategoryDto = UpdateCategoryDto;
__decorate([
    (0, class_validator_1.IsIn)(['publish', 'draft']),
    __metadata("design:type", String)
], UpdateCategoryDto.prototype, "mode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(collapse),
    (0, class_validator_1.IsString)({ message: NAME }),
    (0, class_validator_1.IsNotEmpty)({ message: NAME }),
    __metadata("design:type", String)
], UpdateCategoryDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], UpdateCategoryDto.prototype, "description", void 0);
class DeleteCategoryDto {
}
exports.DeleteCategoryDto = DeleteCategoryDto;
__decorate([
    (0, class_validator_1.IsIn)(['publish', 'draft']),
    __metadata("design:type", String)
], DeleteCategoryDto.prototype, "mode", void 0);
//# sourceMappingURL=category.dto.js.map