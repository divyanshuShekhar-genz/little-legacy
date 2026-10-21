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
exports.ChecklistLimitDto = exports.DeleteChecklistItemDto = exports.ChecklistItemDto = exports.ChecklistQueryDto = exports.REGION = exports.ITEM = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const json_1 = require("../../../common/utils/json");
exports.ITEM = 'Enter a title, instructions and a whole-number order of at least 1.';
const WEEK = 'Choose Week 1, Week 2 or Later weeks.';
exports.REGION = 'Choose a regional learning category.';
const STATUS = 'Choose Draft or Published.';
const LIMIT = 'Enter a whole number of at least 1.';
const MODE = ['publish', 'draft'];
class ChecklistQueryDto {
}
exports.ChecklistQueryDto = ChecklistQueryDto;
__decorate([
    (0, class_transformer_1.Transform)(json_1.trim),
    (0, class_validator_1.IsString)({ message: exports.REGION }),
    (0, class_validator_1.IsNotEmpty)({ message: exports.REGION }),
    __metadata("design:type", String)
], ChecklistQueryDto.prototype, "regionId", void 0);
class ChecklistItemDto {
}
exports.ChecklistItemDto = ChecklistItemDto;
__decorate([
    (0, class_validator_1.IsIn)(MODE),
    __metadata("design:type", String)
], ChecklistItemDto.prototype, "mode", void 0);
__decorate([
    (0, class_transformer_1.Transform)(json_1.trim),
    (0, class_validator_1.IsString)({ message: exports.REGION }),
    (0, class_validator_1.IsNotEmpty)({ message: exports.REGION }),
    __metadata("design:type", String)
], ChecklistItemDto.prototype, "regionId", void 0);
__decorate([
    (0, class_validator_1.IsIn)([1, 2, 3], { message: WEEK }),
    __metadata("design:type", Number)
], ChecklistItemDto.prototype, "week", void 0);
__decorate([
    (0, class_transformer_1.Transform)(json_1.trim),
    (0, class_validator_1.IsString)({ message: exports.ITEM }),
    (0, class_validator_1.IsNotEmpty)({ message: exports.ITEM }),
    __metadata("design:type", String)
], ChecklistItemDto.prototype, "title", void 0);
__decorate([
    (0, class_transformer_1.Transform)(json_1.trim),
    (0, class_validator_1.IsString)({ message: exports.ITEM }),
    (0, class_validator_1.IsNotEmpty)({ message: exports.ITEM }),
    __metadata("design:type", String)
], ChecklistItemDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsInt)({ message: exports.ITEM }),
    (0, class_validator_1.Min)(1, { message: exports.ITEM }),
    __metadata("design:type", Number)
], ChecklistItemDto.prototype, "position", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['DRAFT', 'PUBLISHED'], { message: STATUS }),
    __metadata("design:type", String)
], ChecklistItemDto.prototype, "status", void 0);
class DeleteChecklistItemDto {
}
exports.DeleteChecklistItemDto = DeleteChecklistItemDto;
__decorate([
    (0, class_validator_1.IsIn)(MODE),
    __metadata("design:type", String)
], DeleteChecklistItemDto.prototype, "mode", void 0);
class ChecklistLimitDto {
}
exports.ChecklistLimitDto = ChecklistLimitDto;
__decorate([
    (0, class_validator_1.IsIn)(MODE),
    __metadata("design:type", String)
], ChecklistLimitDto.prototype, "mode", void 0);
__decorate([
    (0, class_transformer_1.Transform)(json_1.trim),
    (0, class_validator_1.IsString)({ message: exports.REGION }),
    (0, class_validator_1.IsNotEmpty)({ message: exports.REGION }),
    __metadata("design:type", String)
], ChecklistLimitDto.prototype, "regionId", void 0);
__decorate([
    (0, class_validator_1.IsInt)({ message: LIMIT }),
    (0, class_validator_1.Min)(1, { message: LIMIT }),
    __metadata("design:type", Number)
], ChecklistLimitDto.prototype, "visibleLimit", void 0);
//# sourceMappingURL=checklist.dto.js.map