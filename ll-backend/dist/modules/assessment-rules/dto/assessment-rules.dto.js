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
exports.SaveRulesDto = exports.PreviewDto = exports.MandatoryPickDto = exports.SampleValuesDto = exports.AreaRuleDto = exports.QuestionWeightsDto = exports.RegionQueryDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const json_1 = require("../../../common/utils/json");
const WEIGHTS = 'Use non-negative weights and at least one positive weight.';
const SAMPLE = 'Enter sample values of 0 or more.';
const COUNT = 'Use a whole number of 0 or more for required completed activities.';
const REGION = 'Choose a regional learning category.';
const MAX_WEIGHT = 1_000_000;
class RegionQueryDto {
}
exports.RegionQueryDto = RegionQueryDto;
__decorate([
    (0, class_transformer_1.Transform)(json_1.trim),
    (0, class_validator_1.IsString)({ message: REGION }),
    (0, class_validator_1.IsNotEmpty)({ message: REGION }),
    __metadata("design:type", String)
], RegionQueryDto.prototype, "regionId", void 0);
class QuestionWeightsDto {
}
exports.QuestionWeightsDto = QuestionWeightsDto;
__decorate([
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }, { message: WEIGHTS }),
    (0, class_validator_1.Min)(0, { message: WEIGHTS }),
    (0, class_validator_1.Max)(MAX_WEIGHT, { message: WEIGHTS }),
    __metadata("design:type", Number)
], QuestionWeightsDto.prototype, "EASY", void 0);
__decorate([
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }, { message: WEIGHTS }),
    (0, class_validator_1.Min)(0, { message: WEIGHTS }),
    (0, class_validator_1.Max)(MAX_WEIGHT, { message: WEIGHTS }),
    __metadata("design:type", Number)
], QuestionWeightsDto.prototype, "MEDIUM", void 0);
__decorate([
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }, { message: WEIGHTS }),
    (0, class_validator_1.Min)(0, { message: WEIGHTS }),
    (0, class_validator_1.Max)(MAX_WEIGHT, { message: WEIGHTS }),
    __metadata("design:type", Number)
], QuestionWeightsDto.prototype, "HARD", void 0);
class AreaRuleDto {
}
exports.AreaRuleDto = AreaRuleDto;
__decorate([
    (0, class_transformer_1.Transform)(json_1.trim),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], AreaRuleDto.prototype, "areaId", void 0);
__decorate([
    (0, class_validator_1.IsString)({ message: 'Enter a formula.' }),
    __metadata("design:type", String)
], AreaRuleDto.prototype, "formula", void 0);
__decorate([
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }, { message: WEIGHTS }),
    (0, class_validator_1.Min)(0, { message: WEIGHTS }),
    (0, class_validator_1.Max)(MAX_WEIGHT, { message: WEIGHTS }),
    __metadata("design:type", Number)
], AreaRuleDto.prototype, "weight", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => QuestionWeightsDto),
    __metadata("design:type", QuestionWeightsDto)
], AreaRuleDto.prototype, "questionWeights", void 0);
class SampleValuesDto {
    constructor() {
        this.questionnaire = 0;
        this.mandatory = 0;
        this.regular = 0;
        this.mastery = 0;
        this.target = 40;
    }
}
exports.SampleValuesDto = SampleValuesDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({}, { message: SAMPLE }),
    (0, class_validator_1.Min)(0, { message: SAMPLE }),
    __metadata("design:type", Number)
], SampleValuesDto.prototype, "questionnaire", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({}, { message: SAMPLE }),
    (0, class_validator_1.Min)(0, { message: SAMPLE }),
    __metadata("design:type", Number)
], SampleValuesDto.prototype, "mandatory", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({}, { message: SAMPLE }),
    (0, class_validator_1.Min)(0, { message: SAMPLE }),
    __metadata("design:type", Number)
], SampleValuesDto.prototype, "regular", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({}, { message: SAMPLE }),
    (0, class_validator_1.Min)(0, { message: SAMPLE }),
    __metadata("design:type", Number)
], SampleValuesDto.prototype, "mastery", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({}, { message: SAMPLE }),
    (0, class_validator_1.Min)(0, { message: SAMPLE }),
    __metadata("design:type", Number)
], SampleValuesDto.prototype, "target", void 0);
class MandatoryPickDto {
}
exports.MandatoryPickDto = MandatoryPickDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], MandatoryPickDto.prototype, "age", void 0);
__decorate([
    (0, class_transformer_1.Transform)(json_1.trim),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], MandatoryPickDto.prototype, "areaId", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], MandatoryPickDto.prototype, "activityIds", void 0);
__decorate([
    (0, class_validator_1.IsInt)({ message: COUNT }),
    (0, class_validator_1.Min)(0, { message: COUNT }),
    (0, class_validator_1.Max)(10_000, { message: COUNT }),
    __metadata("design:type", Number)
], MandatoryPickDto.prototype, "requiredCount", void 0);
class PreviewDto {
    constructor() {
        this.sample = new SampleValuesDto();
    }
}
exports.PreviewDto = PreviewDto;
__decorate([
    (0, class_transformer_1.Transform)(json_1.trim),
    (0, class_validator_1.IsString)({ message: REGION }),
    (0, class_validator_1.IsNotEmpty)({ message: REGION }),
    __metadata("design:type", String)
], PreviewDto.prototype, "regionId", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => AreaRuleDto),
    __metadata("design:type", Array)
], PreviewDto.prototype, "areas", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => SampleValuesDto),
    __metadata("design:type", SampleValuesDto)
], PreviewDto.prototype, "sample", void 0);
class SaveRulesDto extends PreviewDto {
    constructor() {
        super(...arguments);
        this.mandatory = [];
    }
}
exports.SaveRulesDto = SaveRulesDto;
__decorate([
    (0, class_validator_1.IsIn)(['publish', 'draft']),
    __metadata("design:type", String)
], SaveRulesDto.prototype, "mode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => MandatoryPickDto),
    __metadata("design:type", Array)
], SaveRulesDto.prototype, "mandatory", void 0);
//# sourceMappingURL=assessment-rules.dto.js.map