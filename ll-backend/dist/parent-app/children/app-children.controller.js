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
exports.AppChildrenController = void 0;
const common_1 = require("@nestjs/common");
const current_parent_decorator_1 = require("../common/current-parent.decorator");
const parent_auth_guard_1 = require("../common/parent-auth.guard");
const app_children_service_1 = require("./app-children.service");
const app_child_dto_1 = require("./dto/app-child.dto");
let AppChildrenController = class AppChildrenController {
    constructor(children) {
        this.children = children;
    }
    list(parent) {
        return this.children.list(parent);
    }
    create(parent, dto) {
        return this.children.create(parent, dto);
    }
    get(parent, id) {
        return this.children.get(parent, id);
    }
    update(parent, id, dto) {
        return this.children.update(parent, id, dto);
    }
    remove(parent, id) {
        return this.children.remove(parent, id);
    }
};
exports.AppChildrenController = AppChildrenController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_parent_decorator_1.CurrentParent)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AppChildrenController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_parent_decorator_1.CurrentParent)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, app_child_dto_1.CreateChildDto]),
    __metadata("design:returntype", void 0)
], AppChildrenController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, current_parent_decorator_1.CurrentParent)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AppChildrenController.prototype, "get", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, current_parent_decorator_1.CurrentParent)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, app_child_dto_1.UpdateChildDto]),
    __metadata("design:returntype", void 0)
], AppChildrenController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, current_parent_decorator_1.CurrentParent)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AppChildrenController.prototype, "remove", null);
exports.AppChildrenController = AppChildrenController = __decorate([
    (0, common_1.Controller)('app/children'),
    (0, common_1.UseGuards)(parent_auth_guard_1.ParentAuthGuard),
    __metadata("design:paramtypes", [app_children_service_1.AppChildrenService])
], AppChildrenController);
//# sourceMappingURL=app-children.controller.js.map