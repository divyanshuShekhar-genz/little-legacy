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
exports.TeamPostDto = exports.DecisionDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const json_1 = require("../../../common/utils/json");
const EXPIRY = 'Use whole days and hours from 0 to 23.';
class DecisionDto {
    constructor() {
        this.reason = '';
        this.pinned = false;
    }
}
exports.DecisionDto = DecisionDto;
__decorate([
    (0, class_validator_1.IsIn)(['publish', 'draft']),
    __metadata("design:type", String)
], DecisionDto.prototype, "mode", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['approve', 'reject']),
    __metadata("design:type", String)
], DecisionDto.prototype, "action", void 0);
__decorate([
    (0, class_transformer_1.Transform)(json_1.trim),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Enter a message.' }),
    __metadata("design:type", String)
], DecisionDto.prototype, "message", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(json_1.trim),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DecisionDto.prototype, "reason", void 0);
__decorate([
    (0, class_validator_1.IsInt)({ message: EXPIRY }),
    (0, class_validator_1.Min)(0, { message: EXPIRY }),
    (0, class_validator_1.Max)(36500, { message: EXPIRY }),
    __metadata("design:type", Number)
], DecisionDto.prototype, "expiryDays", void 0);
__decorate([
    (0, class_validator_1.IsInt)({ message: EXPIRY }),
    (0, class_validator_1.Min)(0, { message: EXPIRY }),
    (0, class_validator_1.Max)(23, { message: EXPIRY }),
    __metadata("design:type", Number)
], DecisionDto.prototype, "expiryHours", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], DecisionDto.prototype, "pinned", void 0);
class TeamPostDto extends DecisionDto {
}
exports.TeamPostDto = TeamPostDto;
__decorate([
    (0, class_transformer_1.Transform)(json_1.trim),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Enter a title.' }),
    __metadata("design:type", String)
], TeamPostDto.prototype, "title", void 0);
//# sourceMappingURL=decision.dto.js.map