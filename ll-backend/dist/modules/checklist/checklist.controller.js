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
exports.ChecklistController = void 0;
const common_1 = require("@nestjs/common");
const jwt_guard_1 = require("../../common/guards/jwt.guard");
const section_guard_1 = require("../../common/guards/section.guard");
const section_decorator_1 = require("../../common/decorators/section.decorator");
const current_admin_decorator_1 = require("../../common/decorators/current-admin.decorator");
const checklist_service_1 = require("./checklist.service");
const checklist_dto_1 = require("./dto/checklist.dto");
let ChecklistController = class ChecklistController {
    constructor(checklist) {
        this.checklist = checklist;
    }
    list(query) {
        return this.checklist.list(query.regionId);
    }
    saveLimit(admin, dto) {
        return this.checklist.saveLimit(admin, dto);
    }
    create(admin, dto) {
        return this.checklist.save(admin, null, dto);
    }
    update(admin, id, dto) {
        return this.checklist.save(admin, id, dto);
    }
    remove(admin, id, dto) {
        return this.checklist.remove(admin, id, dto.mode);
    }
};
exports.ChecklistController = ChecklistController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [checklist_dto_1.ChecklistQueryDto]),
    __metadata("design:returntype", void 0)
], ChecklistController.prototype, "list", null);
__decorate([
    (0, common_1.Put)('settings'),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, checklist_dto_1.ChecklistLimitDto]),
    __metadata("design:returntype", void 0)
], ChecklistController.prototype, "saveLimit", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, checklist_dto_1.ChecklistItemDto]),
    __metadata("design:returntype", void 0)
], ChecklistController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, checklist_dto_1.ChecklistItemDto]),
    __metadata("design:returntype", void 0)
], ChecklistController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, checklist_dto_1.DeleteChecklistItemDto]),
    __metadata("design:returntype", void 0)
], ChecklistController.prototype, "remove", null);
exports.ChecklistController = ChecklistController = __decorate([
    (0, common_1.Controller)('checklist-items'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard, section_guard_1.SectionGuard),
    (0, section_decorator_1.RequireSection)('parentChecklist'),
    __metadata("design:paramtypes", [checklist_service_1.ChecklistService])
], ChecklistController);
//# sourceMappingURL=checklist.controller.js.map