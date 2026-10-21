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
exports.DeleteAreaDto = exports.UpdateAreaDto = exports.CreateAreaDto = exports.RegionQueryDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const json_1 = require("../../../common/utils/json");
const collapse = ({ value }) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value);
const blankToNull = ({ value }) => (typeof value === 'string' ? value.trim() || null : value);
const NAME = 'Enter a development area name.';
const REGION = 'Choose a regional learning category.';
class RegionQueryDto {
}
exports.RegionQueryDto = RegionQueryDto;
__decorate([
    (0, class_transformer_1.Transform)(json_1.trim),
    (0, class_validator_1.IsString)({ message: REGION }),
    (0, class_validator_1.IsNotEmpty)({ message: REGION }),
    __metadata("design:type", String)
], RegionQueryDto.prototype, "regionId", void 0);
class CreateAreaDto {
    constructor() {
        this.description = null;
    }
}
exports.CreateAreaDto = CreateAreaDto;
__decorate([
    (0, class_validator_1.IsIn)(['publish', 'draft']),
    __metadata("design:type", String)
], CreateAreaDto.prototype, "mode", void 0);
__decorate([
    (0, class_transformer_1.Transform)(json_1.trim),
    (0, class_validator_1.IsString)({ message: REGION }),
    (0, class_validator_1.IsNotEmpty)({ message: REGION }),
    __metadata("design:type", String)
], CreateAreaDto.prototype, "regionId", void 0);
__decorate([
    (0, class_transformer_1.Transform)(collapse),
    (0, class_validator_1.IsString)({ message: NAME }),
    (0, class_validator_1.IsNotEmpty)({ message: NAME }),
    __metadata("design:type", String)
], CreateAreaDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], CreateAreaDto.prototype, "description", void 0);
class UpdateAreaDto {
}
exports.UpdateAreaDto = UpdateAreaDto;
__decorate([
    (0, class_validator_1.IsIn)(['publish', 'draft']),
    __metadata("design:type", String)
], UpdateAreaDto.prototype, "mode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(collapse),
    (0, class_validator_1.IsString)({ message: NAME }),
    (0, class_validator_1.IsNotEmpty)({ message: NAME }),
    __metadata("design:type", String)
], UpdateAreaDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], UpdateAreaDto.prototype, "description", void 0);
class DeleteAreaDto {
}
exports.DeleteAreaDto = DeleteAreaDto;
__decorate([
    (0, class_validator_1.IsIn)(['publish', 'draft']),
    __metadata("design:type", String)
], DeleteAreaDto.prototype, "mode", void 0);
//# sourceMappingURL=area.dto.js.map