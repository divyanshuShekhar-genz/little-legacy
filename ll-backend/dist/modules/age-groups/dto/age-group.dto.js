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
exports.CreateAgeGroupDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const json_1 = require("../../../common/utils/json");
const AGE = 'Enter a non-negative age in years.';
const REGION = 'Choose a regional learning category.';
class CreateAgeGroupDto {
}
exports.CreateAgeGroupDto = CreateAgeGroupDto;
__decorate([
    (0, class_validator_1.IsIn)(['publish', 'draft']),
    __metadata("design:type", String)
], CreateAgeGroupDto.prototype, "mode", void 0);
__decorate([
    (0, class_transformer_1.Transform)(json_1.trim),
    (0, class_validator_1.IsString)({ message: REGION }),
    (0, class_validator_1.IsNotEmpty)({ message: REGION }),
    __metadata("design:type", String)
], CreateAgeGroupDto.prototype, "regionId", void 0);
__decorate([
    (0, class_validator_1.IsInt)({ message: AGE }),
    (0, class_validator_1.Min)(0, { message: AGE }),
    (0, class_validator_1.Max)(2_147_483_647, { message: AGE }),
    __metadata("design:type", Number)
], CreateAgeGroupDto.prototype, "age", void 0);
//# sourceMappingURL=age-group.dto.js.map