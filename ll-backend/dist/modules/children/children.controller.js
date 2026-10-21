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
exports.ChildrenController = void 0;
const common_1 = require("@nestjs/common");
const jwt_guard_1 = require("../../common/guards/jwt.guard");
const section_guard_1 = require("../../common/guards/section.guard");
const section_decorator_1 = require("../../common/decorators/section.decorator");
const children_service_1 = require("./children.service");
const list_children_query_dto_1 = require("./dto/list-children.query.dto");
let ChildrenController = class ChildrenController {
    constructor(children) {
        this.children = children;
    }
    list(query) {
        return this.children.list({ search: query.search || undefined, area: query.area || undefined });
    }
    async learningRecord(id) {
        return { record: await this.children.learningRecord(id) };
    }
};
exports.ChildrenController = ChildrenController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_children_query_dto_1.ListChildrenQueryDto]),
    __metadata("design:returntype", void 0)
], ChildrenController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id/learning-record'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ChildrenController.prototype, "learningRecord", null);
exports.ChildrenController = ChildrenController = __decorate([
    (0, common_1.Controller)('children'),
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard, section_guard_1.SectionGuard),
    (0, section_decorator_1.RequireSection)('childLearning'),
    __metadata("design:paramtypes", [children_service_1.ChildrenService])
], ChildrenController);
//# sourceMappingURL=children.controller.js.map