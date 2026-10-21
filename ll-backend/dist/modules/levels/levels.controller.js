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
exports.LevelsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_guard_1 = require("../../common/guards/jwt.guard");
const section_guard_1 = require("../../common/guards/section.guard");
const current_admin_decorator_1 = require("../../common/decorators/current-admin.decorator");
const levels_service_1 = require("./levels.service");
const level_dto_1 = require("./dto/level.dto");
let LevelsController = class LevelsController {
    constructor(levels) {
        this.levels = levels;
    }
    list(query) {
        return this.levels.list(query);
    }
    create(admin, dto) {
        return this.levels.create(admin, dto);
    }
    update(admin, id, dto) {
        return this.levels.update(admin, id, dto);
    }
    remove(admin, id, dto) {
        return this.levels.remove(admin, id, dto);
    }
};
exports.LevelsController = LevelsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [level_dto_1.LevelQueryDto]),
    __metadata("design:returntype", void 0)
], LevelsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, level_dto_1.CreateLevelDto]),
    __metadata("design:returntype", void 0)
], LevelsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, level_dto_1.UpdateLevelDto]),
    __metadata("design:returntype", void 0)
], LevelsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, level_dto_1.DeleteLevelDto]),
    __metadata("design:returntype", void 0)
], LevelsController.prototype, "remove", null);
exports.LevelsController = LevelsController = __decorate([
    (0, common_1.Controller)('levels'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard, section_guard_1.SectionGuard),
    __metadata("design:paramtypes", [levels_service_1.LevelsService])
], LevelsController);
//# sourceMappingURL=levels.controller.js.map