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
exports.RejectProductDto = exports.ProductDto = exports.ProductImageDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const blankToNull = ({ value }) => (typeof value === 'string' ? value.trim() || null : value);
const text = ({ value }) => (typeof value === 'string' ? value.trim() : value);
class ProductImageDto {
}
exports.ProductImageDto = ProductImageDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ProductImageDto.prototype, "url", void 0);
class ProductDto {
    constructor() {
        this.images = [];
        this.prices = {};
    }
}
exports.ProductDto = ProductDto;
__decorate([
    (0, class_validator_1.IsIn)(['publish', 'draft']),
    __metadata("design:type", String)
], ProductDto.prototype, "mode", void 0);
__decorate([
    (0, class_transformer_1.Transform)(text),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ProductDto.prototype, "title", void 0);
__decorate([
    (0, class_transformer_1.Transform)(text),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ProductDto.prototype, "sku", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], ProductDto.prototype, "category", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], ProductDto.prototype, "ageRecommendation", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], ProductDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], ProductDto.prototype, "details", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], ProductDto.prototype, "materials", void 0);
__decorate([
    (0, class_validator_1.Allow)(),
    __metadata("design:type", Object)
], ProductDto.prototype, "stock", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['DRAFT', 'PUBLISHED', 'WITHDRAWN'], { message: 'Choose Draft, Published or Archived.' }),
    __metadata("design:type", String)
], ProductDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ProductImageDto),
    __metadata("design:type", Array)
], ProductDto.prototype, "images", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)({ message: 'Prices must be zero or greater.' }),
    __metadata("design:type", Object)
], ProductDto.prototype, "prices", void 0);
class RejectProductDto {
}
exports.RejectProductDto = RejectProductDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], RejectProductDto.prototype, "reason", void 0);
//# sourceMappingURL=product.dto.js.map