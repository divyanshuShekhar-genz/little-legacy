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
exports.WeekPreviewDto = exports.PreviewOutcomeDto = exports.ProgressionDto = exports.OverrideDto = exports.BaseDto = exports.RegionQueryDto = exports.OVERRIDE_NUMBERS = exports.BASES = exports.COUNTS = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const json_1 = require("../../../common/utils/json");
exports.COUNTS = 'Counts and days must be whole numbers; weekly count must be positive.';
exports.BASES = 'Base ranges must start at 0 and increase up to 100; starting levels must be positive whole numbers.';
exports.OVERRIDE_NUMBERS = 'Override limits and starting levels must be positive whole numbers.';
const INT_MAX = 2_147_483_647;
class RegionQueryDto {
}
exports.RegionQueryDto = RegionQueryDto;
__decorate([
    (0, class_transformer_1.Transform)(json_1.trim),
    (0, class_validator_1.IsString)({ message: 'Choose a regional learning category.' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Choose a regional learning category.' }),
    __metadata("design:type", String)
], RegionQueryDto.prototype, "regionId", void 0);
class BaseDto {
}
exports.BaseDto = BaseDto;
__decorate([
    (0, class_validator_1.IsIn)(['Base 1', 'Base 2', 'Base 3'], { message: exports.BASES }),
    __metadata("design:type", String)
], BaseDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsInt)({ message: exports.BASES }),
    (0, class_validator_1.Min)(0, { message: exports.BASES }),
    (0, class_validator_1.Max)(100, { message: exports.BASES }),
    __metadata("design:type", Number)
], BaseDto.prototype, "from", void 0);
__decorate([
    (0, class_validator_1.IsInt)({ message: exports.BASES }),
    (0, class_validator_1.Min)(1, { message: exports.BASES }),
    (0, class_validator_1.Max)(INT_MAX, { message: exports.BASES }),
    __metadata("design:type", Number)
], BaseDto.prototype, "start", void 0);
class OverrideDto {
}
exports.OverrideDto = OverrideDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OverrideDto.prototype, "age", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OverrideDto.prototype, "base", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OverrideDto.prototype, "area", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OverrideDto.prototype, "plan", void 0);
__decorate([
    (0, class_validator_1.IsInt)({ message: exports.OVERRIDE_NUMBERS }),
    (0, class_validator_1.Min)(1, { message: exports.OVERRIDE_NUMBERS }),
    (0, class_validator_1.Max)(INT_MAX, { message: exports.OVERRIDE_NUMBERS }),
    __metadata("design:type", Number)
], OverrideDto.prototype, "limit", void 0);
__decorate([
    (0, class_validator_1.IsInt)({ message: exports.OVERRIDE_NUMBERS }),
    (0, class_validator_1.Min)(1, { message: exports.OVERRIDE_NUMBERS }),
    (0, class_validator_1.Max)(INT_MAX, { message: exports.OVERRIDE_NUMBERS }),
    __metadata("design:type", Number)
], OverrideDto.prototype, "start", void 0);
class ProgressionDto {
    constructor() {
        this.overrides = [];
    }
}
exports.ProgressionDto = ProgressionDto;
__decorate([
    (0, class_validator_1.IsIn)(['publish', 'draft']),
    __metadata("design:type", String)
], ProgressionDto.prototype, "mode", void 0);
__decorate([
    (0, class_validator_1.IsArray)({ message: exports.BASES }),
    (0, class_validator_1.ArrayMinSize)(3, { message: exports.BASES }),
    (0, class_validator_1.ArrayMaxSize)(3, { message: exports.BASES }),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => BaseDto),
    __metadata("design:type", Array)
], ProgressionDto.prototype, "bases", void 0);
__decorate([
    (0, class_validator_1.IsInt)({ message: exports.COUNTS }),
    (0, class_validator_1.Min)(1, { message: exports.COUNTS }),
    (0, class_validator_1.Max)(INT_MAX, { message: exports.COUNTS }),
    __metadata("design:type", Number)
], ProgressionDto.prototype, "weekly", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)({ message: exports.COUNTS }),
    (0, class_validator_1.Min)(1, { message: exports.COUNTS }),
    (0, class_validator_1.Max)(INT_MAX, { message: exports.COUNTS }),
    __metadata("design:type", Object)
], ProgressionDto.prototype, "maxVisible", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ProgressionDto.prototype, "pendingEnabled", void 0);
__decorate([
    (0, class_validator_1.IsInt)({ message: exports.COUNTS }),
    (0, class_validator_1.Min)(0, { message: exports.COUNTS }),
    (0, class_validator_1.Max)(INT_MAX, { message: exports.COUNTS }),
    __metadata("design:type", Number)
], ProgressionDto.prototype, "pendingLimit", void 0);
__decorate([
    (0, class_validator_1.IsInt)({ message: exports.COUNTS }),
    (0, class_validator_1.Min)(0, { message: exports.COUNTS }),
    (0, class_validator_1.Max)(INT_MAX, { message: exports.COUNTS }),
    __metadata("design:type", Number)
], ProgressionDto.prototype, "pendingDays", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ProgressionDto.prototype, "pendingCounts", void 0);
__decorate([
    (0, class_validator_1.IsInt)({ message: exports.COUNTS }),
    (0, class_validator_1.Min)(0, { message: exports.COUNTS }),
    (0, class_validator_1.Max)(INT_MAX, { message: exports.COUNTS }),
    __metadata("design:type", Number)
], ProgressionDto.prototype, "recent", void 0);
__decorate([
    (0, class_validator_1.IsInt)({ message: exports.COUNTS }),
    (0, class_validator_1.Min)(0, { message: exports.COUNTS }),
    (0, class_validator_1.Max)(INT_MAX, { message: exports.COUNTS }),
    __metadata("design:type", Number)
], ProgressionDto.prototype, "continueCount", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['same', 'easier'], { message: 'Choose same or easier.' }),
    __metadata("design:type", String)
], ProgressionDto.prototype, "reinforcement", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['anniversary', '0', '1', '2', '3', '4', '5', '6'], { message: 'Choose a weekly boundary.' }),
    __metadata("design:type", String)
], ProgressionDto.prototype, "resetDay", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => OverrideDto),
    __metadata("design:type", Array)
], ProgressionDto.prototype, "overrides", void 0);
class PreviewOutcomeDto {
}
exports.PreviewOutcomeDto = PreviewOutcomeDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PreviewOutcomeDto.prototype, "assignmentId", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['INDEPENDENT', 'WITH_HELP', 'UNABLE'], { message: 'Choose Independently, With help or Could not complete.' }),
    __metadata("design:type", String)
], PreviewOutcomeDto.prototype, "outcome", void 0);
class WeekPreviewDto {
    constructor() {
        this.score = 0;
        this.skills = {};
        this.week = 1;
        this.level = 1;
        this.outcomes = [];
    }
}
exports.WeekPreviewDto = WeekPreviewDto;
__decorate([
    (0, class_validator_1.IsInt)({ message: 'Enter a non-negative age in years.' }),
    (0, class_validator_1.Min)(0, { message: 'Enter a non-negative age in years.' }),
    __metadata("design:type", Number)
], WeekPreviewDto.prototype, "age", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['FREE', 'PLUS', 'PREMIUM'], { message: 'Choose a minimum plan.' }),
    __metadata("design:type", String)
], WeekPreviewDto.prototype, "plan", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['COMPLETED', 'NOT_SUBMITTED'], { message: 'Choose whether the questionnaire was completed.' }),
    __metadata("design:type", String)
], WeekPreviewDto.prototype, "questionnaire", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({}, { message: 'Enter an assessment score from 0 to 100.' }),
    (0, class_validator_1.Min)(0, { message: 'Enter an assessment score from 0 to 100.' }),
    (0, class_validator_1.Max)(100, { message: 'Enter an assessment score from 0 to 100.' }),
    __metadata("design:type", Number)
], WeekPreviewDto.prototype, "score", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() || null : value)),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], WeekPreviewDto.prototype, "country", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)({ message: 'Enter skill scores from 0 to 100.' }),
    __metadata("design:type", Object)
], WeekPreviewDto.prototype, "skills", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)({ message: 'Choose a week from 1 to 52.' }),
    (0, class_validator_1.Min)(1, { message: 'Choose a week from 1 to 52.' }),
    (0, class_validator_1.Max)(52, { message: 'Choose a week from 1 to 52.' }),
    __metadata("design:type", Number)
], WeekPreviewDto.prototype, "week", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)({ message: 'Enter a level of 1 or more.' }),
    (0, class_validator_1.Min)(1, { message: 'Enter a level of 1 or more.' }),
    (0, class_validator_1.Max)(INT_MAX, { message: 'Enter a level of 1 or more.' }),
    __metadata("design:type", Number)
], WeekPreviewDto.prototype, "level", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => PreviewOutcomeDto),
    __metadata("design:type", Array)
], WeekPreviewDto.prototype, "outcomes", void 0);
//# sourceMappingURL=progression.dto.js.map