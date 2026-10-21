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
exports.ListActivityReviewsQueryDto = exports.DIFFICULTY_ANSWERS = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
exports.DIFFICULTY_ANSWERS = ['Just right', 'Easy', 'Challenging'];
class ListActivityReviewsQueryDto {
}
exports.ListActivityReviewsQueryDto = ListActivityReviewsQueryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => (typeof value === 'string' && value.trim() ? value.trim() : undefined)),
    (0, class_validator_1.IsIn)(exports.DIFFICULTY_ANSWERS, { message: 'Choose Just right, Easy or Challenging.' }),
    __metadata("design:type", Object)
], ListActivityReviewsQueryDto.prototype, "difficulty", void 0);
//# sourceMappingURL=list-activity-reviews.query.dto.js.map