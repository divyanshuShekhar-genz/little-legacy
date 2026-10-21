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
exports.DeleteRestrictionDto = exports.RestrictionDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const rules_1 = require("../../../common/rules");
const json_1 = require("../../../common/utils/json");
const INVALID = 'Choose a valid country, target and message.';
class RestrictionDto {
}
exports.RestrictionDto = RestrictionDto;
__decorate([
    (0, class_validator_1.IsIn)(['publish', 'draft']),
    __metadata("design:type", String)
], RestrictionDto.prototype, "mode", void 0);
__decorate([
    (0, class_transformer_1.Transform)(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value)),
    (0, class_validator_1.IsString)({ message: INVALID }),
    (0, class_validator_1.Length)(2, 2, { message: INVALID }),
    __metadata("design:type", String)
], RestrictionDto.prototype, "countryCode", void 0);
__decorate([
    (0, class_validator_1.IsIn)(rules_1.RESTRICTION_TYPE_KEYS, { message: INVALID }),
    __metadata("design:type", String)
], RestrictionDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ message: INVALID }),
    __metadata("design:type", Object)
], RestrictionDto.prototype, "targetId", void 0);
__decorate([
    (0, class_transformer_1.Transform)(json_1.trim),
    (0, class_validator_1.IsString)({ message: INVALID }),
    (0, class_validator_1.IsNotEmpty)({ message: INVALID }),
    __metadata("design:type", String)
], RestrictionDto.prototype, "message", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], RestrictionDto.prototype, "enabled", void 0);
class DeleteRestrictionDto {
}
exports.DeleteRestrictionDto = DeleteRestrictionDto;
__decorate([
    (0, class_validator_1.IsIn)(['publish', 'draft']),
    __metadata("design:type", String)
], DeleteRestrictionDto.prototype, "mode", void 0);
//# sourceMappingURL=restriction.dto.js.map