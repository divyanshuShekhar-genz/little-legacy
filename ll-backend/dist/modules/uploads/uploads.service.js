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
exports.UploadsService = void 0;
const node_crypto_1 = require("node:crypto");
const common_1 = require("@nestjs/common");
const file_type_1 = require("file-type");
const prisma_service_1 = require("../../prisma/prisma.service");
const storage_interface_1 = require("../../common/storage/storage.interface");
const rules_1 = require("../../common/rules");
let UploadsService = class UploadsService {
    constructor(prisma, storage) {
        this.prisma = prisma;
        this.storage = storage;
    }
    async upload(admin, file, expectedKind) {
        if (!file)
            throw new common_1.BadRequestException('Choose a file to upload.');
        const detected = await (0, file_type_1.fromBuffer)(file.buffer);
        const kind = detected ? (0, rules_1.uploadKindFor)(detected.mime) : null;
        if (!detected || !kind)
            throw new common_1.BadRequestException('This file type is not supported.');
        if (expectedKind && kind !== expectedKind) {
            throw new common_1.BadRequestException(`Choose a file of type: ${rules_1.UPLOAD_RULES[expectedKind].label}.`);
        }
        if (file.size > rules_1.UPLOAD_RULES[kind].maxBytes) {
            throw new common_1.BadRequestException(`File is too large. ${rules_1.UPLOAD_RULES[kind].label}.`);
        }
        const now = new Date();
        const month = String(now.getUTCMonth() + 1).padStart(2, '0');
        const key = `${kind.toLowerCase()}s/${now.getUTCFullYear()}/${month}/${(0, node_crypto_1.randomUUID)()}.${detected.ext}`;
        const { url } = await this.storage.put(key, file.buffer, detected.mime);
        try {
            const upload = await this.prisma.upload.create({
                data: {
                    key,
                    url,
                    kind,
                    mimeType: detected.mime,
                    sizeBytes: file.size,
                    originalName: file.originalname.slice(0, 255),
                    driver: this.storage.name,
                    uploadedById: admin.id,
                },
            });
            return { upload };
        }
        catch (e) {
            await this.storage.delete(key);
            throw e;
        }
    }
};
exports.UploadsService = UploadsService;
exports.UploadsService = UploadsService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(storage_interface_1.STORAGE)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, Object])
], UploadsService);
//# sourceMappingURL=uploads.service.js.map