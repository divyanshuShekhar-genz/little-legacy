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
exports.SkillsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_guard_1 = require("../../common/guards/jwt.guard");
const section_guard_1 = require("../../common/guards/section.guard");
const section_decorator_1 = require("../../common/decorators/section.decorator");
const current_admin_decorator_1 = require("../../common/decorators/current-admin.decorator");
const skills_service_1 = require("./skills.service");
const selection_preview_service_1 = require("./selection-preview.service");
const skill_dto_1 = require("./dto/skill.dto");
let SkillsController = class SkillsController {
    constructor(skills, selection) {
        this.skills = skills;
        this.selection = selection;
    }
    list(query) {
        return this.skills.list(query);
    }
    create(admin, dto) {
        return this.skills.create(admin, dto);
    }
    update(admin, id, dto) {
        return this.skills.update(admin, id, dto);
    }
    preview(dto) {
        return this.selection.preview(dto);
    }
};
exports.SkillsController = SkillsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [skill_dto_1.SkillQueryDto]),
    __metadata("design:returntype", void 0)
], SkillsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    (0, section_decorator_1.RequireSection)('skillPersonalisation'),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, skill_dto_1.CreateSkillDto]),
    __metadata("design:returntype", void 0)
], SkillsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, section_decorator_1.RequireSection)('skillPersonalisation'),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, skill_dto_1.UpdateSkillDto]),
    __metadata("design:returntype", void 0)
], SkillsController.prototype, "update", null);
__decorate([
    (0, common_1.Post)('preview'),
    (0, common_1.HttpCode)(200),
    (0, section_decorator_1.RequireSection)('skillPersonalisation'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [skill_dto_1.SelectionPreviewDto]),
    __metadata("design:returntype", void 0)
], SkillsController.prototype, "preview", null);
exports.SkillsController = SkillsController = __decorate([
    (0, common_1.Controller)('skills'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard, section_guard_1.SectionGuard),
    __metadata("design:paramtypes", [skills_service_1.SkillsService,
        selection_preview_service_1.SelectionPreviewService])
], SkillsController);
//# sourceMappingURL=skills.controller.js.map