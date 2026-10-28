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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const rules_1 = require("../../common/rules");
let UsersService = class UsersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list({ search, age }) {
        const contains = search ? { contains: search, mode: 'insensitive' } : undefined;
        const [parents, ageGroups] = await Promise.all([
            this.prisma.parent.findMany({
                where: { deletedAt: null, ...(contains ? { OR: [{ name: contains }, { email: contains }, { children: { some: { name: contains } } }] } : {}) },
                include: { children: { orderBy: { createdAt: 'asc' } } },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.ageGroup.findMany({ distinct: ['age'], select: { age: true }, orderBy: { age: 'asc' } }),
        ]);
        const now = new Date();
        let rows = parents.flatMap((p) => {
            const base = { parentId: p.id, parentName: p.name, email: p.email, registeredAt: p.createdAt.toISOString() };
            if (p.children.length === 0)
                return [{ ...base, childId: null, childName: null, age: null, ageMonths: null, dobEstimated: null }];
            return p.children.map((c) => {
                const a = c.dob ? (0, rules_1.ageOn)(c.dob, now) : null;
                return { ...base, childId: c.id, childName: c.name, age: a?.years ?? null, ageMonths: a?.months ?? null, dobEstimated: c.dobEstimated };
            });
        });
        if (age !== undefined)
            rows = rows.filter((r) => r.age === age);
        const ages = [...new Set([...ageGroups.map((a) => a.age), ...rows.flatMap((r) => (r.age === null ? [] : [r.age]))])].sort((a, b) => a - b);
        return { rows, ages };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map