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
exports.DeleteActivityDto = exports.ActivityDto = exports.ActivityQueryDto = exports.PreviewDto = exports.StepDto = exports.AVAILABILITY = exports.SKILL_STAGES = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const rules_1 = require("../../../common/rules");
const json_1 = require("../../../common/utils/json");
const blankToNull = ({ value }) => (typeof value === 'string' ? value.trim() || null : value);
const INT_MAX = 2_147_483_647;
const AGE = 'Enter a non-negative age in years.';
const DURATION_MASTERY = 'Use a positive duration and at least one whole completion for mastery.';
const LEVEL = 'Choose an existing level. Add a level first if none are available.';
const STEPS = 'Keep at least one activity step.';
const AREA = 'Choose a development area.';
const MARKS = 'Enter whole-number first completion marks of 0 or more.';
exports.SKILL_STAGES = ['STARTING', 'PRACTISING', 'CONFIDENT'];
exports.AVAILABILITY = ['DRAFT', 'PUBLISHED'];
class StepDto {
}
exports.StepDto = StepDto;
__decorate([
    (0, class_transformer_1.Transform)(json_1.trim),
    (0, class_validator_1.IsString)({ message: 'Enter a step title.' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Enter a step title.' }),
    __metadata("design:type", String)
], StepDto.prototype, "title", void 0);
__decorate([
    (0, class_transformer_1.Transform)(json_1.trim),
    (0, class_validator_1.IsString)({ message: 'Enter the step guidance description.' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Enter the step guidance description.' }),
    __metadata("design:type", String)
], StepDto.prototype, "description", void 0);
class PreviewDto {
}
exports.PreviewDto = PreviewDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], PreviewDto.prototype, "imageUrl", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], PreviewDto.prototype, "caption", void 0);
class ActivityQueryDto {
}
exports.ActivityQueryDto = ActivityQueryDto;
__decorate([
    (0, class_transformer_1.Transform)(json_1.trim),
    (0, class_validator_1.IsString)({ message: 'Choose a regional learning category.' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Choose a regional learning category.' }),
    __metadata("design:type", String)
], ActivityQueryDto.prototype, "regionId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], ActivityQueryDto.prototype, "areaId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], ActivityQueryDto.prototype, "categoryId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], ActivityQueryDto.prototype, "levelId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)({ message: AGE }),
    (0, class_validator_1.Min)(0, { message: AGE }),
    __metadata("design:type", Number)
], ActivityQueryDto.prototype, "age", void 0);
class ActivityDto {
    constructor() {
        this.skillStage = 'STARTING';
        this.status = 'DRAFT';
        this.previews = [];
    }
}
exports.ActivityDto = ActivityDto;
__decorate([
    (0, class_validator_1.IsIn)(['publish', 'draft']),
    __metadata("design:type", String)
], ActivityDto.prototype, "mode", void 0);
__decorate([
    (0, class_transformer_1.Transform)(json_1.trim),
    (0, class_validator_1.IsString)({ message: 'Enter an activity title.' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Enter an activity title.' }),
    __metadata("design:type", String)
], ActivityDto.prototype, "title", void 0);
__decorate([
    (0, class_transformer_1.Transform)(json_1.trim),
    (0, class_validator_1.IsString)({ message: AREA }),
    (0, class_validator_1.IsNotEmpty)({ message: AREA }),
    __metadata("design:type", String)
], ActivityDto.prototype, "areaId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], ActivityDto.prototype, "categoryId", void 0);
__decorate([
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)({ message: LEVEL }),
    (0, class_validator_1.IsNotEmpty)({ message: LEVEL }),
    __metadata("design:type", String)
], ActivityDto.prototype, "levelId", void 0);
__decorate([
    (0, class_validator_1.IsInt)({ message: AGE }),
    (0, class_validator_1.Min)(0, { message: AGE }),
    (0, class_validator_1.Max)(INT_MAX, { message: AGE }),
    __metadata("design:type", Number)
], ActivityDto.prototype, "age", void 0);
__decorate([
    (0, class_validator_1.IsInt)({ message: DURATION_MASTERY }),
    (0, class_validator_1.Min)(1, { message: DURATION_MASTERY }),
    (0, class_validator_1.Max)(INT_MAX, { message: DURATION_MASTERY }),
    __metadata("design:type", Number)
], ActivityDto.prototype, "durationMinutes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], ActivityDto.prototype, "materials", void 0);
__decorate([
    (0, class_transformer_1.Transform)(json_1.trim),
    (0, class_validator_1.IsString)({ message: 'Enter a description.' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Enter a description.' }),
    __metadata("design:type", String)
], ActivityDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsIn)(rules_1.PLAN_TIERS, { message: 'Choose a minimum plan.' }),
    __metadata("design:type", String)
], ActivityDto.prototype, "minimumPlan", void 0);
__decorate([
    (0, class_validator_1.IsInt)({ message: MARKS }),
    (0, class_validator_1.Min)(0, { message: MARKS }),
    (0, class_validator_1.Max)(INT_MAX, { message: MARKS }),
    __metadata("design:type", Number)
], ActivityDto.prototype, "baseMarks", void 0);
__decorate([
    (0, class_validator_1.IsInt)({ message: DURATION_MASTERY }),
    (0, class_validator_1.Min)(1, { message: DURATION_MASTERY }),
    (0, class_validator_1.Max)(INT_MAX, { message: DURATION_MASTERY }),
    __metadata("design:type", Number)
], ActivityDto.prototype, "masteryTarget", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], ActivityDto.prototype, "skillId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(exports.SKILL_STAGES, { message: 'Choose Starting, Practising or Confident.' }),
    __metadata("design:type", Object)
], ActivityDto.prototype, "skillStage", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(exports.AVAILABILITY, { message: 'Choose Draft or Published.' }),
    __metadata("design:type", Object)
], ActivityDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], ActivityDto.prototype, "groupId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)({ message: 'Use a unique positive whole difficulty level for this activity.' }),
    (0, class_validator_1.Min)(1, { message: 'Use a unique positive whole difficulty level for this activity.' }),
    (0, class_validator_1.Max)(INT_MAX, { message: 'Use a unique positive whole difficulty level for this activity.' }),
    __metadata("design:type", Object)
], ActivityDto.prototype, "difficulty", void 0);
__decorate([
    (0, class_validator_1.IsArray)({ message: STEPS }),
    (0, class_validator_1.ArrayMinSize)(1, { message: STEPS }),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => StepDto),
    __metadata("design:type", Array)
], ActivityDto.prototype, "steps", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => PreviewDto),
    __metadata("design:type", Array)
], ActivityDto.prototype, "previews", void 0);
class DeleteActivityDto {
}
exports.DeleteActivityDto = DeleteActivityDto;
__decorate([
    (0, class_validator_1.IsIn)(['publish', 'draft']),
    __metadata("design:type", String)
], DeleteActivityDto.prototype, "mode", void 0);
//# sourceMappingURL=activity.dto.js.map