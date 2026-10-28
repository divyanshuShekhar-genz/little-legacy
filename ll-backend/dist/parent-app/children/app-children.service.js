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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppChildrenService = exports.CHILD_NOT_FOUND = void 0;
exports.ownedChild = ownedChild;
const common_1 = require("@nestjs/common");
const rules_1 = require("../../common/rules");
const prisma_service_1 = require("../../prisma/prisma.service");
const parent_views_1 = require("../common/parent-views");
const fields_1 = require("../common/fields");
exports.CHILD_NOT_FOUND = 'Child not found.';
const NOT_AVAILABLE = "Sorry, this isn't available in your country yet.";
const DOB = "Enter your child's date of birth.";
const AGE = "Enter your child's age in years and months.";
async function ownedChild(db, parentId, childId) {
    const child = await db.child.findFirst({ where: { id: childId, parentId }, select: parent_views_1.childSelect });
    if (!child)
        throw new common_1.NotFoundException(exports.CHILD_NOT_FOUND);
    return child;
}
function birthDate(collectDob, dto) {
    if (collectDob) {
        if (dto.dob === undefined)
            throw new common_1.BadRequestException(DOB);
        const dob = (0, fields_1.parseDay)(dto.dob);
        if (!dob)
            throw new common_1.BadRequestException(DOB);
        if (dob > (0, fields_1.today)())
            throw new common_1.BadRequestException("The date of birth can't be in the future.");
        return { dob, estimated: false };
    }
    if (!dto.age)
        throw new common_1.BadRequestException(AGE);
    return { dob: (0, rules_1.estimateDob)(dto.age, (0, fields_1.today)()), estimated: true };
}
let AppChildrenService = class AppChildrenService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(parent) {
        const rows = await this.prisma.child.findMany({ where: { parentId: parent.id }, orderBy: { createdAt: 'asc' }, select: parent_views_1.childSelect });
        const now = new Date();
        return { children: rows.map((c) => (0, parent_views_1.toParentChild)(c, now)) };
    }
    async get(parent, id) {
        return { child: (0, parent_views_1.toParentChild)(await ownedChild(this.prisma, parent.id, id)) };
    }
    async create(parent, dto) {
        const row = await this.prisma.parent.findUniqueOrThrow({ where: { id: parent.id }, select: { countryCode: true, dob: true, phone: true, termsAcceptedAt: true } });
        const blocking = (0, rules_1.blocksChildren)((0, rules_1.profileGaps)(row));
        if (blocking.includes('country'))
            throw new common_1.BadRequestException('Choose your country first.');
        if (blocking.includes('terms'))
            throw new common_1.BadRequestException('Please accept the terms and conditions and privacy policy first.');
        const category = (await (0, parent_views_1.loadParentAccount)(this.prisma, parent.id)).childCategory;
        if (!category)
            throw new common_1.BadRequestException(NOT_AVAILABLE);
        const { dob, estimated } = birthDate(category.collectDob, dto);
        const child = await this.prisma.child.create({
            data: { parentId: parent.id, name: dto.name, gender: dto.gender ?? null, dob, dobEstimated: estimated, regionId: category.id },
            select: parent_views_1.childSelect,
        });
        return { child: (0, parent_views_1.toParentChild)(child) };
    }
    async update(parent, id, dto) {
        const child = await ownedChild(this.prisma, parent.id, id);
        const data = {};
        if (dto.name !== undefined)
            data.name = dto.name;
        if (dto.gender !== undefined)
            data.gender = dto.gender;
        if (dto.dob !== undefined || dto.age !== undefined) {
            const collectDob = child.region.childFieldSettings[0]?.collected ?? true;
            const next = birthDate(collectDob, dto);
            const same = child.dob?.getTime() === next.dob.getTime() && child.dobEstimated === next.estimated;
            if (!same) {
                const change = (0, rules_1.dobChange)(child, next.estimated);
                if (!change.allowed)
                    throw new common_1.BadRequestException('You can only correct the date of birth once.');
                data.dob = next.dob;
                data.dobEstimated = next.estimated;
                if (change.countsAsCorrection)
                    data.dobCorrectedAt = new Date();
                const now = new Date();
                if (child.dob && (0, rules_1.completedYears)(child.dob, now) !== (0, rules_1.completedYears)(next.dob, now)) {
                    const { cycleStartedAt } = await this.prisma.child.findUniqueOrThrow({ where: { id: child.id }, select: { cycleStartedAt: true } });
                    if (cycleStartedAt)
                        data.cycleStartedAt = now;
                }
            }
        }
        const updated = await this.prisma.child.update({ where: { id: child.id }, data, select: parent_views_1.childSelect });
        return { child: (0, parent_views_1.toParentChild)(updated) };
    }
    async remove(parent, id) {
        const child = await ownedChild(this.prisma, parent.id, id);
        await this.prisma.child.delete({ where: { id: child.id } });
        return { status: 'deleted' };
    }
};
exports.AppChildrenService = AppChildrenService;
exports.AppChildrenService = AppChildrenService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AppChildrenService);
//# sourceMappingURL=app-children.service.js.map