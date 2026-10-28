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
exports.DeleteAccountDto = exports.ChangePasswordDto = exports.UpdateAccountDto = void 0;
const class_validator_1 = require("class-validator");
const fields_1 = require("../../common/fields");
class UpdateAccountDto {
}
exports.UpdateAccountDto = UpdateAccountDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, fields_1.NameField)('Enter your full name.'),
    __metadata("design:type", String)
], UpdateAccountDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, fields_1.DateField)('Enter your date of birth.'),
    __metadata("design:type", String)
], UpdateAccountDto.prototype, "dob", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, fields_1.PhoneField)(),
    __metadata("design:type", String)
], UpdateAccountDto.prototype, "phone", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, fields_1.CountryField)(),
    __metadata("design:type", String)
], UpdateAccountDto.prototype, "countryCode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, fields_1.LanguageField)(),
    __metadata("design:type", String)
], UpdateAccountDto.prototype, "language", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)({ message: 'Please accept the terms and conditions and privacy policy.' }),
    __metadata("design:type", Boolean)
], UpdateAccountDto.prototype, "acceptTerms", void 0);
class ChangePasswordDto {
}
exports.ChangePasswordDto = ChangePasswordDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ message: 'Enter your current password.' }),
    __metadata("design:type", String)
], ChangePasswordDto.prototype, "currentPassword", void 0);
__decorate([
    (0, fields_1.PasswordField)(),
    __metadata("design:type", String)
], ChangePasswordDto.prototype, "newPassword", void 0);
class DeleteAccountDto {
}
exports.DeleteAccountDto = DeleteAccountDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ message: 'Enter your password to delete your account.' }),
    __metadata("design:type", String)
], DeleteAccountDto.prototype, "password", void 0);
//# sourceMappingURL=account.dto.js.map