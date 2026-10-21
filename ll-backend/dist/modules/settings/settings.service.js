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
exports.SettingsService = exports.SETTING_ENTITY = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const drafts_service_1 = require("../drafts/drafts.service");
exports.SETTING_ENTITY = 'Setting';
let SettingsService = class SettingsService {
    constructor(prisma, drafts) {
        this.prisma = prisma;
        this.drafts = drafts;
    }
    onModuleInit() {
        this.drafts.register(exports.SETTING_ENTITY, {
            snapshot: async (tx, key) => {
                const row = await tx.setting.findUnique({ where: { key } });
                return { key, value: row?.value ?? null };
            },
            apply: async (tx, key, { value }) => {
                if (!key)
                    throw new common_1.BadRequestException('A setting key is required.');
                await tx.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
                return key;
            },
        });
    }
    async get(key, fallback) {
        const row = await this.prisma.setting.findUnique({ where: { key } });
        return row ? row.value : fallback;
    }
};
exports.SettingsService = SettingsService;
exports.SettingsService = SettingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        drafts_service_1.DraftsService])
], SettingsService);
//# sourceMappingURL=settings.service.js.map