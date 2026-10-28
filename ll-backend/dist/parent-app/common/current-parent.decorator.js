"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentParent = void 0;
const common_1 = require("@nestjs/common");
exports.CurrentParent = (0, common_1.createParamDecorator)((_data, ctx) => {
    const parent = ctx.switchToHttp().getRequest().parent;
    if (!parent)
        throw new common_1.UnauthorizedException();
    return parent;
});
//# sourceMappingURL=current-parent.decorator.js.map