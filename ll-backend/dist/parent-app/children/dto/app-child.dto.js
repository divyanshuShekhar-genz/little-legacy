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
exports.UpdateChildDto = exports.CreateChildDto = exports.ChildAgeDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const rules_1 = require("../../../common/rules");
const fields_1 = require("../../common/fields");
const YEARS = "Enter your child's age in years.";
const MONTHS = 'Enter the months as a number from 0 to 11.';
const GENDER = 'Choose a gender from the list.';
const DOB = "Enter your child's date of birth.";
class ChildAgeDto {
}
exports.ChildAgeDto = ChildAgeDto;
__decorate([
    (0, class_validator_1.IsInt)({ message: YEARS }),
    (0, class_validator_1.Min)(0, { message: YEARS }),
    (0, class_validator_1.Max)(17, { message: YEARS }),
    __metadata("design:type", Number)
], ChildAgeDto.prototype, "years", void 0);
__decorate([
    (0, class_validator_1.IsInt)({ message: MONTHS }),
    (0, class_validator_1.Min)(0, { message: MONTHS }),
    (0, class_validator_1.Max)(11, { message: MONTHS }),
    __metadata("design:type", Number)
], ChildAgeDto.prototype, "months", void 0);
class CreateChildDto {
}
exports.CreateChildDto = CreateChildDto;
__decorate([
    (0, fields_1.NameField)("Enter your child's name."),
    __metadata("design:type", String)
], CreateChildDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, fields_1.DateField)(DOB),
    __metadata("design:type", String)
], CreateChildDto.prototype, "dob", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ChildAgeDto),
    __metadata("design:type", ChildAgeDto)
], CreateChildDto.prototype, "age", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(rules_1.CHILD_GENDERS, { message: GENDER }),
    __metadata("design:type", String)
], CreateChildDto.prototype, "gender", void 0);
class UpdateChildDto {
}
exports.UpdateChildDto = UpdateChildDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, fields_1.NameField)("Enter your child's name."),
    __metadata("design:type", String)
], UpdateChildDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, fields_1.DateField)(DOB),
    __metadata("design:type", String)
], UpdateChildDto.prototype, "dob", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ChildAgeDto),
    __metadata("design:type", ChildAgeDto)
], UpdateChildDto.prototype, "age", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(rules_1.CHILD_GENDERS, { message: GENDER }),
    __metadata("design:type", Object)
], UpdateChildDto.prototype, "gender", void 0);
//# sourceMappingURL=app-child.dto.js.map