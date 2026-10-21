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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LibraryCategoriesController = void 0;
const common_1 = require("@nestjs/common");
const jwt_guard_1 = require("../../common/guards/jwt.guard");
const section_guard_1 = require("../../common/guards/section.guard");
const current_admin_decorator_1 = require("../../common/decorators/current-admin.decorator");
const library_categories_service_1 = require("./library-categories.service");
const library_dto_1 = require("./dto/library.dto");
let LibraryCategoriesController = class LibraryCategoriesController {
    constructor(categories) {
        this.categories = categories;
    }
    list(admin, query) {
        return this.categories.list(admin, query.kind);
    }
    create(admin, dto) {
        return this.categories.create(admin, dto);
    }
    rename(admin, id, dto) {
        return this.categories.rename(admin, id, dto);
    }
    remove(admin, id, dto) {
        return this.categories.remove(admin, id, dto);
    }
};
exports.LibraryCategoriesController = LibraryCategoriesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, library_dto_1.CategoryKindQueryDto]),
    __metadata("design:returntype", void 0)
], LibraryCategoriesController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, library_dto_1.CreateLibraryCategoryDto]),
    __metadata("design:returntype", void 0)
], LibraryCategoriesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, library_dto_1.RenameLibraryCategoryDto]),
    __metadata("design:returntype", void 0)
], LibraryCategoriesController.prototype, "rename", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, library_dto_1.DeleteLibraryCategoryDto]),
    __metadata("design:returntype", void 0)
], LibraryCategoriesController.prototype, "remove", null);
exports.LibraryCategoriesController = LibraryCategoriesController = __decorate([
    (0, common_1.Controller)('library-categories'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard, section_guard_1.SectionGuard),
    __metadata("design:paramtypes", [library_categories_service_1.LibraryCategoriesService])
], LibraryCategoriesController);
//# sourceMappingURL=library-categories.controller.js.map