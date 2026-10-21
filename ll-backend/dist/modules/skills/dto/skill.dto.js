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
exports.SelectionPreviewDto = exports.UpdateSkillDto = exports.CreateSkillDto = exports.ExpectationDto = exports.SkillQueryDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const rules_1 = require("../../../common/rules");
const json_1 = require("../../../common/utils/json");
const collapse = ({ value }) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value);
const blankToNull = ({ value }) => (typeof value === 'string' ? value.trim() || null : value);
const NAME = 'Enter a skill name.';
const EXPECTED = 'Use an expected score from 0 to 100.';
class SkillQueryDto {
}
exports.SkillQueryDto = SkillQueryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], SkillQueryDto.prototype, "areaId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], SkillQueryDto.prototype, "regionId", void 0);
class ExpectationDto {
}
exports.ExpectationDto = ExpectationDto;
__decorate([
    (0, class_validator_1.IsInt)({ message: 'Enter a non-negative age in years.' }),
    (0, class_validator_1.Min)(0, { message: 'Enter a non-negative age in years.' }),
    __metadata("design:type", Number)
], ExpectationDto.prototype, "age", void 0);
__decorate([
    (0, class_validator_1.IsInt)({ message: EXPECTED }),
    (0, class_validator_1.Min)(0, { message: EXPECTED }),
    (0, class_validator_1.Max)(100, { message: EXPECTED }),
    __metadata("design:type", Number)
], ExpectationDto.prototype, "expectedScore", void 0);
class CreateSkillDto {
    constructor() {
        this.expected = [];
    }
}
exports.CreateSkillDto = CreateSkillDto;
__decorate([
    (0, class_validator_1.IsIn)(['publish', 'draft']),
    __metadata("design:type", String)
], CreateSkillDto.prototype, "mode", void 0);
__decorate([
    (0, class_transformer_1.Transform)(json_1.trim),
    (0, class_validator_1.IsString)({ message: 'Choose a development area.' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Choose a development area.' }),
    __metadata("design:type", String)
], CreateSkillDto.prototype, "areaId", void 0);
__decorate([
    (0, class_transformer_1.Transform)(collapse),
    (0, class_validator_1.IsString)({ message: NAME }),
    (0, class_validator_1.IsNotEmpty)({ message: NAME }),
    __metadata("design:type", String)
], CreateSkillDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ExpectationDto),
    __metadata("design:type", Array)
], CreateSkillDto.prototype, "expected", void 0);
class UpdateSkillDto {
}
exports.UpdateSkillDto = UpdateSkillDto;
__decorate([
    (0, class_validator_1.IsIn)(['publish', 'draft']),
    __metadata("design:type", String)
], UpdateSkillDto.prototype, "mode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(json_1.trim),
    (0, class_validator_1.IsString)({ message: 'Choose a development area.' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Choose a development area.' }),
    __metadata("design:type", String)
], UpdateSkillDto.prototype, "areaId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(collapse),
    (0, class_validator_1.IsString)({ message: NAME }),
    (0, class_validator_1.IsNotEmpty)({ message: NAME }),
    __metadata("design:type", String)
], UpdateSkillDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ExpectationDto),
    __metadata("design:type", Array)
], UpdateSkillDto.prototype, "expected", void 0);
class SelectionPreviewDto {
}
exports.SelectionPreviewDto = SelectionPreviewDto;
__decorate([
    (0, class_transformer_1.Transform)(json_1.trim),
    (0, class_validator_1.IsString)({ message: 'Choose a child.' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Choose a child.' }),
    __metadata("design:type", String)
], SelectionPreviewDto.prototype, "childId", void 0);
__decorate([
    (0, class_transformer_1.Transform)(json_1.trim),
    (0, class_validator_1.IsString)({ message: 'Choose a development area.' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Choose a development area.' }),
    __metadata("design:type", String)
], SelectionPreviewDto.prototype, "areaId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(rules_1.PLAN_TIERS, { message: 'Choose a minimum plan.' }),
    __metadata("design:type", String)
], SelectionPreviewDto.prototype, "plan", void 0);
//# sourceMappingURL=skill.dto.js.map