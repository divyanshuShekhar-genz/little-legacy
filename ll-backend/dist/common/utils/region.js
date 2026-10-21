"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertRegion = assertRegion;
exports.currentArea = currentArea;
exports.currentCategory = currentCategory;
const common_1 = require("@nestjs/common");
async function assertRegion(db, regionId) {
    const region = await db.learningRegion.findUnique({ where: { id: regionId }, select: { id: true } });
    if (!region)
        throw new common_1.BadRequestException('Choose a regional learning category.');
}
async function currentArea(db, areaId) {
    const area = await db.developmentArea.findUnique({ where: { id: areaId } });
    if (!area || area.removedAt)
        throw new common_1.NotFoundException('Development area not found');
    return area;
}
async function currentCategory(db, categoryId) {
    const category = await db.activityCategory.findUnique({ where: { id: categoryId }, include: { area: true } });
    if (!category || category.removedAt || category.area.removedAt)
        throw new common_1.NotFoundException('Category not found');
    return category;
}
//# sourceMappingURL=region.js.map