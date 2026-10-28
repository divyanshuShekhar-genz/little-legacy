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
exports.AppOptionsController = void 0;
const common_1 = require("@nestjs/common");
const rules_1 = require("../../common/rules");
const prisma_service_1 = require("../../prisma/prisma.service");
let AppOptionsController = class AppOptionsController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async options() {
        const countries = await this.prisma.country.findMany({
            where: { enabled: true },
            orderBy: { name: 'asc' },
            select: { code: true, name: true, currency: true, learningRegion: { select: { active: true } } },
        });
        return {
            countries: countries.map((c) => ({ code: c.code, name: c.name, currency: c.currency, learningAvailable: c.learningRegion?.active ?? false })),
            languages: rules_1.PARENT_LANGUAGES.map((l) => ({ code: l.code, name: l.name })),
        };
    }
    async legal() {
        const latest = await this.prisma.appContentVersion.findFirst({ orderBy: { version: 'desc' } });
        const entries = Object.values((latest?.entries ?? {}));
        const pick = (surface) => {
            const e = entries.find((x) => x.surface === surface);
            return e ? { title: e.title, body: e.body } : null;
        };
        return { version: latest?.version ?? null, terms: pick('TERMS'), privacy: pick('PRIVACY') };
    }
};
exports.AppOptionsController = AppOptionsController;
__decorate([
    (0, common_1.Get)('options'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppOptionsController.prototype, "options", null);
__decorate([
    (0, common_1.Get)('legal'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppOptionsController.prototype, "legal", null);
exports.AppOptionsController = AppOptionsController = __decorate([
    (0, common_1.Controller)('app'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AppOptionsController);
//# sourceMappingURL=app-options.controller.js.map