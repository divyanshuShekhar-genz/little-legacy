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
exports.AccountController = void 0;
const common_1 = require("@nestjs/common");
const current_parent_decorator_1 = require("../common/current-parent.decorator");
const parent_auth_guard_1 = require("../common/parent-auth.guard");
const account_service_1 = require("./account.service");
const account_dto_1 = require("./dto/account.dto");
let AccountController = class AccountController {
    constructor(account) {
        this.account = account;
    }
    get(parent) {
        return this.account.get(parent);
    }
    update(parent, dto) {
        return this.account.update(parent, dto);
    }
    changePassword(parent, dto) {
        return this.account.changePassword(parent, dto);
    }
    delete(parent, dto) {
        return this.account.delete(parent, dto);
    }
};
exports.AccountController = AccountController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_parent_decorator_1.CurrentParent)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AccountController.prototype, "get", null);
__decorate([
    (0, common_1.Patch)(),
    __param(0, (0, current_parent_decorator_1.CurrentParent)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, account_dto_1.UpdateAccountDto]),
    __metadata("design:returntype", void 0)
], AccountController.prototype, "update", null);
__decorate([
    (0, common_1.Post)('password'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, current_parent_decorator_1.CurrentParent)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, account_dto_1.ChangePasswordDto]),
    __metadata("design:returntype", void 0)
], AccountController.prototype, "changePassword", null);
__decorate([
    (0, common_1.Post)('delete'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, current_parent_decorator_1.CurrentParent)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, account_dto_1.DeleteAccountDto]),
    __metadata("design:returntype", void 0)
], AccountController.prototype, "delete", null);
exports.AccountController = AccountController = __decorate([
    (0, common_1.Controller)('app/me'),
    (0, common_1.UseGuards)(parent_auth_guard_1.ParentAuthGuard),
    __metadata("design:paramtypes", [account_service_1.AccountService])
], AccountController);
//# sourceMappingURL=account.controller.js.map