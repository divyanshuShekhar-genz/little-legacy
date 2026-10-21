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
exports.DeleteLibraryCategoryDto = exports.RenameLibraryCategoryDto = exports.CreateLibraryCategoryDto = exports.CategoryKindQueryDto = exports.RejectItemDto = exports.LibraryItemDto = exports.ChapterDto = exports.PageDto = exports.PageImageDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const rules_1 = require("../../../common/rules");
const blankToNull = ({ value }) => (typeof value === 'string' ? value.trim() || null : value);
const text = ({ value }) => (typeof value === 'string' ? value.trim() : value);
class PageImageDto {
}
exports.PageImageDto = PageImageDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PageImageDto.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PageImageDto.prototype, "imageUrl", void 0);
class PageDto {
    constructor() {
        this.images = [];
    }
}
exports.PageDto = PageDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PageDto.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], PageDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => PageImageDto),
    __metadata("design:type", Array)
], PageDto.prototype, "images", void 0);
class ChapterDto {
    constructor() {
        this.pages = [];
    }
}
exports.ChapterDto = ChapterDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ChapterDto.prototype, "id", void 0);
__decorate([
    (0, class_transformer_1.Transform)(text),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ChapterDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], ChapterDto.prototype, "musicUrl", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => PageDto),
    __metadata("design:type", Array)
], ChapterDto.prototype, "pages", void 0);
class LibraryItemDto {
    constructor() {
        this.minimumPlan = 'FREE';
        this.chapters = [];
    }
}
exports.LibraryItemDto = LibraryItemDto;
__decorate([
    (0, class_validator_1.IsIn)(['publish', 'draft']),
    __metadata("design:type", String)
], LibraryItemDto.prototype, "mode", void 0);
__decorate([
    (0, class_transformer_1.Transform)(text),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LibraryItemDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], LibraryItemDto.prototype, "categoryId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], LibraryItemDto.prototype, "coverUrl", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], LibraryItemDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(rules_1.PLAN_TIERS, { message: 'Choose a minimum plan.' }),
    __metadata("design:type", String)
], LibraryItemDto.prototype, "minimumPlan", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], LibraryItemDto.prototype, "mediaUrl", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => (typeof value === 'string' ? (value.trim() ? value.replace(/\s+$/, '') : null) : value)),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], LibraryItemDto.prototype, "lyrics", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ChapterDto),
    __metadata("design:type", Array)
], LibraryItemDto.prototype, "chapters", void 0);
class RejectItemDto {
}
exports.RejectItemDto = RejectItemDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], RejectItemDto.prototype, "reason", void 0);
const collapse = ({ value }) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value);
class CategoryKindQueryDto {
}
exports.CategoryKindQueryDto = CategoryKindQueryDto;
__decorate([
    (0, class_validator_1.IsIn)(['STORY', 'RHYME'], { message: 'Choose stories or rhymes.' }),
    __metadata("design:type", String)
], CategoryKindQueryDto.prototype, "kind", void 0);
class CreateLibraryCategoryDto {
}
exports.CreateLibraryCategoryDto = CreateLibraryCategoryDto;
__decorate([
    (0, class_validator_1.IsIn)(['publish', 'draft']),
    __metadata("design:type", String)
], CreateLibraryCategoryDto.prototype, "mode", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['STORY', 'RHYME'], { message: 'Choose stories or rhymes.' }),
    __metadata("design:type", String)
], CreateLibraryCategoryDto.prototype, "kind", void 0);
__decorate([
    (0, class_transformer_1.Transform)(collapse),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLibraryCategoryDto.prototype, "name", void 0);
class RenameLibraryCategoryDto {
}
exports.RenameLibraryCategoryDto = RenameLibraryCategoryDto;
__decorate([
    (0, class_validator_1.IsIn)(['publish', 'draft']),
    __metadata("design:type", String)
], RenameLibraryCategoryDto.prototype, "mode", void 0);
__decorate([
    (0, class_transformer_1.Transform)(collapse),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RenameLibraryCategoryDto.prototype, "name", void 0);
class DeleteLibraryCategoryDto {
}
exports.DeleteLibraryCategoryDto = DeleteLibraryCategoryDto;
__decorate([
    (0, class_validator_1.IsIn)(['publish', 'draft']),
    __metadata("design:type", String)
], DeleteLibraryCategoryDto.prototype, "mode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(blankToNull),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], DeleteLibraryCategoryDto.prototype, "replacementId", void 0);
//# sourceMappingURL=library.dto.js.map