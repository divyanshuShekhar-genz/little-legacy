"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.today = exports.LanguageField = exports.CountryField = exports.PhoneField = exports.DateField = exports.NameField = exports.PasswordField = exports.EmailField = exports.DATE_FORMAT = exports.PASSWORD_RULE = void 0;
exports.parseDay = parseDay;
const common_1 = require("@nestjs/common");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const rules_1 = require("../../common/rules");
const lower = ({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);
const upper = ({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value);
const collapse = ({ value }) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value);
const phoneDigits = ({ value }) => (typeof value === 'string' ? value.replace(/[\s\-().]/g, '') : value);
exports.PASSWORD_RULE = `Use at least ${rules_1.PASSWORD_MIN_LENGTH} characters for your password.`;
exports.DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;
const EmailField = () => (0, common_1.applyDecorators)((0, class_transformer_1.Transform)(lower), (0, class_validator_1.IsEmail)({}, { message: 'Enter a valid email address.' }), (0, class_validator_1.MaxLength)(254, { message: 'Enter a valid email address.' }));
exports.EmailField = EmailField;
const PasswordField = (message = exports.PASSWORD_RULE) => (0, common_1.applyDecorators)((0, class_validator_1.IsString)({ message }), (0, class_validator_1.MinLength)(rules_1.PASSWORD_MIN_LENGTH, { message }), (0, class_validator_1.MaxLength)(128, { message: 'Use 128 characters or fewer for your password.' }));
exports.PasswordField = PasswordField;
const NameField = (message) => (0, common_1.applyDecorators)((0, class_transformer_1.Transform)(collapse), (0, class_validator_1.IsString)({ message }), (0, class_validator_1.IsNotEmpty)({ message }), (0, class_validator_1.MaxLength)(80, { message: 'Use 80 characters or fewer for the name.' }));
exports.NameField = NameField;
const DateField = (message) => (0, common_1.applyDecorators)((0, class_validator_1.IsString)({ message }), (0, class_validator_1.Matches)(exports.DATE_FORMAT, { message }));
exports.DateField = DateField;
const PhoneField = () => (0, common_1.applyDecorators)((0, class_transformer_1.Transform)(phoneDigits), (0, class_validator_1.IsString)({ message: 'Enter your phone number.' }), (0, class_validator_1.Matches)(/^\+[1-9]\d{6,14}$/, { message: 'Enter your phone number with the country code, e.g. +919876543210.' }));
exports.PhoneField = PhoneField;
const CountryField = () => (0, common_1.applyDecorators)((0, class_transformer_1.Transform)(upper), (0, class_validator_1.IsString)({ message: 'Choose your country.' }), (0, class_validator_1.Matches)(/^[A-Z]{2}$/, { message: 'Choose your country.' }));
exports.CountryField = CountryField;
const LanguageField = () => (0, common_1.applyDecorators)((0, class_validator_1.IsIn)(rules_1.PARENT_LANGUAGES.map((l) => l.code), { message: 'Choose a language from the list.' }));
exports.LanguageField = LanguageField;
function parseDay(s) {
    if (!exports.DATE_FORMAT.test(s))
        return null;
    const d = new Date(`${s}T00:00:00Z`);
    return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s ? null : d;
}
const today = () => new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
exports.today = today;
//# sourceMappingURL=fields.js.map