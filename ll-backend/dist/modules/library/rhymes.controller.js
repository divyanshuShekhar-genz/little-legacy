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
exports.RhymesController = void 0;
const common_1 = require("@nestjs/common");
const jwt_guard_1 = require("../../common/guards/jwt.guard");
const section_guard_1 = require("../../common/guards/section.guard");
const section_decorator_1 = require("../../common/decorators/section.decorator");
const current_admin_decorator_1 = require("../../common/decorators/current-admin.decorator");
const library_service_1 = require("./library.service");
const library_dto_1 = require("./dto/library.dto");
let RhymesController = class RhymesController {
    constructor(library) {
        this.library = library;
    }
    list() {
        return this.library.list('RHYME');
    }
    get(id) {
        return this.library.get('RHYME', id);
    }
    create(admin, dto) {
        return this.library.save(admin, 'RHYME', null, dto);
    }
    update(admin, id, dto) {
        return this.library.save(admin, 'RHYME', id, dto);
    }
    reject(admin, id, dto) {
        return this.library.reject(admin, 'RHYME', id, dto.reason ?? null);
    }
};
exports.RhymesController = RhymesController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], RhymesController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RhymesController.prototype, "get", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, library_dto_1.LibraryItemDto]),
    __metadata("design:returntype", void 0)
], RhymesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, library_dto_1.LibraryItemDto]),
    __metadata("design:returntype", void 0)
], RhymesController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/reject'),
    (0, common_1.HttpCode)(200),
    (0, section_decorator_1.RequireSection)('superAdmin'),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, library_dto_1.RejectItemDto]),
    __metadata("design:returntype", void 0)
], RhymesController.prototype, "reject", null);
exports.RhymesController = RhymesController = __decorate([
    (0, common_1.Controller)('rhymes'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard, section_guard_1.SectionGuard),
    (0, section_decorator_1.RequireSection)('rhymes'),
    __metadata("design:paramtypes", [library_service_1.LibraryService])
], RhymesController);
//# sourceMappingURL=rhymes.controller.js.map