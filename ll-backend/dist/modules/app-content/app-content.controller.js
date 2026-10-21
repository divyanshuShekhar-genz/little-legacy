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
exports.AppContentController = void 0;
const common_1 = require("@nestjs/common");
const jwt_guard_1 = require("../../common/guards/jwt.guard");
const section_guard_1 = require("../../common/guards/section.guard");
const section_decorator_1 = require("../../common/decorators/section.decorator");
const current_admin_decorator_1 = require("../../common/decorators/current-admin.decorator");
const app_content_service_1 = require("./app-content.service");
const app_content_dto_1 = require("./dto/app-content.dto");
let AppContentController = class AppContentController {
    constructor(content) {
        this.content = content;
    }
    get() {
        return this.content.get();
    }
    create(admin, dto) {
        return this.content.createEntry(admin, dto);
    }
    update(admin, key, dto) {
        return this.content.updateEntry(admin, key, dto);
    }
    remove(admin, key) {
        return this.content.deleteEntry(admin, key);
    }
    publish(admin, dto) {
        return this.content.publish(admin, dto.mode);
    }
};
exports.AppContentController = AppContentController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppContentController.prototype, "get", null);
__decorate([
    (0, common_1.Post)('entries'),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, app_content_dto_1.CreateEntryDto]),
    __metadata("design:returntype", void 0)
], AppContentController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)('entries/:key'),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('key')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, app_content_dto_1.UpdateEntryDto]),
    __metadata("design:returntype", void 0)
], AppContentController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)('entries/:key'),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AppContentController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)('publish'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, app_content_dto_1.PublishDto]),
    __metadata("design:returntype", void 0)
], AppContentController.prototype, "publish", null);
exports.AppContentController = AppContentController = __decorate([
    (0, common_1.Controller)('app-content'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard, section_guard_1.SectionGuard),
    (0, section_decorator_1.RequireSection)('appContent'),
    __metadata("design:paramtypes", [app_content_service_1.AppContentService])
], AppContentController);
//# sourceMappingURL=app-content.controller.js.map