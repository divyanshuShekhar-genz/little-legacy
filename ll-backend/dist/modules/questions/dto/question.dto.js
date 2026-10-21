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
exports.DeleteQuestionDto = exports.SkillMapDto = exports.CreateQuestionDto = exports.UpdateQuestionDto = exports.OptionDto = exports.QuestionQueryDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const rules_1 = require("../../../common/rules");
const json_1 = require("../../../common/utils/json");
const blankToNull = ({ value }) => (typeof value === 'string' ? value.trim() || null : value);
const OPTIONS = 'Add at least two options with non-negative marks: label | marks';
const AGE = 'Enter a non-negative age in years.';
const AREA = 'Choose a development area.';
class QuestionQueryDto {
}
exports.QuestionQueryDto = QuestionQueryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], QuestionQueryDto.prototype, "areaId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], QuestionQueryDto.prototype, "regionId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)({ message: AGE }),
    (0, class_validator_1.Min)(0, { message: AGE }),
    __metadata("design:type", Number)
], QuestionQueryDto.prototype, "age", void 0);
class OptionDto {
}
exports.OptionDto = OptionDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], OptionDto.prototype, "id", void 0);
__decorate([
    (0, class_transformer_1.Transform)(json_1.trim),
    (0, class_validator_1.IsString)({ message: OPTIONS }),
    (0, class_validator_1.IsNotEmpty)({ message: OPTIONS }),
    __metadata("design:type", String)
], OptionDto.prototype, "label", void 0);
__decorate([
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }, { message: OPTIONS }),
    (0, class_validator_1.Min)(0, { message: OPTIONS }),
    (0, class_validator_1.Max)(999_999.99, { message: OPTIONS }),
    __metadata("design:type", Number)
], OptionDto.prototype, "marks", void 0);
class UpdateQuestionDto {
}
exports.UpdateQuestionDto = UpdateQuestionDto;
__decorate([
    (0, class_validator_1.IsIn)(['publish', 'draft']),
    __metadata("design:type", String)
], UpdateQuestionDto.prototype, "mode", void 0);
__decorate([
    (0, class_transformer_1.Transform)(json_1.trim),
    (0, class_validator_1.IsString)({ message: 'Enter a question.' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Enter a question.' }),
    __metadata("design:type", String)
], UpdateQuestionDto.prototype, "text", void 0);
__decorate([
    (0, class_validator_1.IsIn)(rules_1.QUESTION_DIFFICULTIES, { message: 'Choose Easy, Medium or Hard.' }),
    __metadata("design:type", String)
], UpdateQuestionDto.prototype, "difficulty", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)({ message: AGE }),
    (0, class_validator_1.Min)(0, { message: AGE }),
    (0, class_validator_1.Max)(2_147_483_647, { message: AGE }),
    __metadata("design:type", Object)
], UpdateQuestionDto.prototype, "age", void 0);
__decorate([
    (0, class_validator_1.IsArray)({ message: OPTIONS }),
    (0, class_validator_1.ArrayMinSize)(2, { message: OPTIONS }),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => OptionDto),
    __metadata("design:type", Array)
], UpdateQuestionDto.prototype, "options", void 0);
class CreateQuestionDto extends UpdateQuestionDto {
}
exports.CreateQuestionDto = CreateQuestionDto;
__decorate([
    (0, class_transformer_1.Transform)(json_1.trim),
    (0, class_validator_1.IsString)({ message: AREA }),
    (0, class_validator_1.IsNotEmpty)({ message: AREA }),
    __metadata("design:type", String)
], CreateQuestionDto.prototype, "areaId", void 0);
class SkillMapDto {
    constructor() {
        this.stages = {};
    }
}
exports.SkillMapDto = SkillMapDto;
__decorate([
    (0, class_validator_1.IsIn)(['publish', 'draft']),
    __metadata("design:type", String)
], SkillMapDto.prototype, "mode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], SkillMapDto.prototype, "skillId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)({ message: 'Choose a stage for each answer.' }),
    __metadata("design:type", Object)
], SkillMapDto.prototype, "stages", void 0);
class DeleteQuestionDto {
}
exports.DeleteQuestionDto = DeleteQuestionDto;
__decorate([
    (0, class_validator_1.IsIn)(['publish', 'draft']),
    __metadata("design:type", String)
], DeleteQuestionDto.prototype, "mode", void 0);
//# sourceMappingURL=question.dto.js.map