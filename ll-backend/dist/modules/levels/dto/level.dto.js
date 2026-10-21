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
exports.DeleteLevelDto = exports.UpdateLevelDto = exports.CreateLevelDto = exports.LevelQueryDto = exports.DEFAULT_ICON_COLOUR = exports.LEVEL_ICONS = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const json_1 = require("../../../common/utils/json");
exports.LEVEL_ICONS = ['Brain', 'Smile', 'Moon', 'Target', 'Footprints', 'Palette', 'Heart', 'Users', 'Eye', 'Lightbulb'];
exports.DEFAULT_ICON_COLOUR = '#5B4DB4';
const blankToNull = ({ value }) => (typeof value === 'string' ? value.trim() || null : value);
const WHOLE = 'Level and mastery count must be whole numbers.';
const SCORE = 'Enter a whole-number required score of 0 or more.';
const AREA = 'Choose a development area.';
const INT_MAX = 2_147_483_647;
class LevelQueryDto {
}
exports.LevelQueryDto = LevelQueryDto;
__decorate([
    (0, class_transformer_1.Transform)(json_1.trim),
    (0, class_validator_1.IsString)({ message: AREA }),
    (0, class_validator_1.IsNotEmpty)({ message: AREA }),
    __metadata("design:type", String)
], LevelQueryDto.prototype, "areaId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], LevelQueryDto.prototype, "categoryId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)({ message: 'Enter a non-negative age in years.' }),
    (0, class_validator_1.Min)(0, { message: 'Enter a non-negative age in years.' }),
    __metadata("design:type", Number)
], LevelQueryDto.prototype, "age", void 0);
class LevelFields {
}
__decorate([
    (0, class_validator_1.IsIn)(['publish', 'draft']),
    __metadata("design:type", String)
], LevelFields.prototype, "mode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], LevelFields.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsIn)([...exports.LEVEL_ICONS, null], { message: 'Choose one of the level icons.' }),
    __metadata("design:type", Object)
], LevelFields.prototype, "icon", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value)),
    (0, class_validator_1.Matches)(/^#[0-9A-F]{6}$/, { message: 'Choose an icon colour.' }),
    __metadata("design:type", String)
], LevelFields.prototype, "iconColor", void 0);
class CreateLevelDto extends LevelFields {
}
exports.CreateLevelDto = CreateLevelDto;
__decorate([
    (0, class_transformer_1.Transform)(json_1.trim),
    (0, class_validator_1.IsString)({ message: AREA }),
    (0, class_validator_1.IsNotEmpty)({ message: AREA }),
    __metadata("design:type", String)
], CreateLevelDto.prototype, "areaId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], CreateLevelDto.prototype, "categoryId", void 0);
__decorate([
    (0, class_validator_1.IsInt)({ message: WHOLE }),
    (0, class_validator_1.Min)(1, { message: WHOLE }),
    (0, class_validator_1.Max)(INT_MAX, { message: WHOLE }),
    __metadata("design:type", Number)
], CreateLevelDto.prototype, "number", void 0);
__decorate([
    (0, class_validator_1.IsInt)({ message: SCORE }),
    (0, class_validator_1.Min)(0, { message: SCORE }),
    (0, class_validator_1.Max)(INT_MAX, { message: SCORE }),
    __metadata("design:type", Number)
], CreateLevelDto.prototype, "requiredScore", void 0);
__decorate([
    (0, class_validator_1.IsInt)({ message: WHOLE }),
    (0, class_validator_1.Min)(0, { message: WHOLE }),
    (0, class_validator_1.Max)(INT_MAX, { message: WHOLE }),
    __metadata("design:type", Number)
], CreateLevelDto.prototype, "requiredMastered", void 0);
class UpdateLevelDto extends LevelFields {
}
exports.UpdateLevelDto = UpdateLevelDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)({ message: WHOLE }),
    (0, class_validator_1.Min)(1, { message: WHOLE }),
    (0, class_validator_1.Max)(INT_MAX, { message: WHOLE }),
    __metadata("design:type", Number)
], UpdateLevelDto.prototype, "number", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)({ message: SCORE }),
    (0, class_validator_1.Min)(0, { message: SCORE }),
    (0, class_validator_1.Max)(INT_MAX, { message: SCORE }),
    __metadata("design:type", Number)
], UpdateLevelDto.prototype, "requiredScore", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)({ message: WHOLE }),
    (0, class_validator_1.Min)(0, { message: WHOLE }),
    (0, class_validator_1.Max)(INT_MAX, { message: WHOLE }),
    __metadata("design:type", Number)
], UpdateLevelDto.prototype, "requiredMastered", void 0);
class DeleteLevelDto {
}
exports.DeleteLevelDto = DeleteLevelDto;
__decorate([
    (0, class_validator_1.IsIn)(['publish', 'draft']),
    __metadata("design:type", String)
], DeleteLevelDto.prototype, "mode", void 0);
//# sourceMappingURL=level.dto.js.map