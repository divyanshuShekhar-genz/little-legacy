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
exports.ResetPasswordDto = exports.VerifyCodeDto = exports.ForgotPasswordDto = exports.RefreshDto = exports.SocialLoginDto = exports.AppLoginDto = exports.RegisterDto = void 0;
const class_validator_1 = require("class-validator");
const fields_1 = require("../../common/fields");
class RegisterDto {
}
exports.RegisterDto = RegisterDto;
__decorate([
    (0, fields_1.NameField)('Enter your full name.'),
    __metadata("design:type", String)
], RegisterDto.prototype, "name", void 0);
__decorate([
    (0, fields_1.DateField)('Enter your date of birth.'),
    __metadata("design:type", String)
], RegisterDto.prototype, "dob", void 0);
__decorate([
    (0, fields_1.PhoneField)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "phone", void 0);
__decorate([
    (0, fields_1.EmailField)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "email", void 0);
__decorate([
    (0, fields_1.PasswordField)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, fields_1.CountryField)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "countryCode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, fields_1.LanguageField)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "language", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)({ message: 'Please accept the terms and conditions and privacy policy.' }),
    __metadata("design:type", Boolean)
], RegisterDto.prototype, "acceptTerms", void 0);
class AppLoginDto {
}
exports.AppLoginDto = AppLoginDto;
__decorate([
    (0, fields_1.EmailField)(),
    __metadata("design:type", String)
], AppLoginDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)({ message: 'Enter your password.' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Enter your password.' }),
    __metadata("design:type", String)
], AppLoginDto.prototype, "password", void 0);
class SocialLoginDto {
}
exports.SocialLoginDto = SocialLoginDto;
__decorate([
    (0, class_validator_1.IsString)({ message: 'Sign-in failed. Please try again.' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Sign-in failed. Please try again.' }),
    __metadata("design:type", String)
], SocialLoginDto.prototype, "idToken", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, fields_1.NameField)('Enter your full name.'),
    __metadata("design:type", String)
], SocialLoginDto.prototype, "name", void 0);
class RefreshDto {
}
exports.RefreshDto = RefreshDto;
__decorate([
    (0, class_validator_1.IsString)({ message: 'Your session has ended. Please sign in again.' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Your session has ended. Please sign in again.' }),
    __metadata("design:type", String)
], RefreshDto.prototype, "refreshToken", void 0);
class ForgotPasswordDto {
}
exports.ForgotPasswordDto = ForgotPasswordDto;
__decorate([
    (0, fields_1.EmailField)(),
    __metadata("design:type", String)
], ForgotPasswordDto.prototype, "email", void 0);
class VerifyCodeDto {
}
exports.VerifyCodeDto = VerifyCodeDto;
__decorate([
    (0, fields_1.EmailField)(),
    __metadata("design:type", String)
], VerifyCodeDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)({ message: 'Enter the 6-digit code.' }),
    (0, class_validator_1.Matches)(/^\d{6}$/, { message: 'Enter the 6-digit code.' }),
    __metadata("design:type", String)
], VerifyCodeDto.prototype, "code", void 0);
class ResetPasswordDto {
}
exports.ResetPasswordDto = ResetPasswordDto;
__decorate([
    (0, class_validator_1.IsString)({ message: 'Your reset has expired. Please start again.' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Your reset has expired. Please start again.' }),
    __metadata("design:type", String)
], ResetPasswordDto.prototype, "resetToken", void 0);
__decorate([
    (0, fields_1.PasswordField)(),
    __metadata("design:type", String)
], ResetPasswordDto.prototype, "password", void 0);
//# sourceMappingURL=app-auth.dto.js.map