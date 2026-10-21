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
exports.EnquiriesService = exports.REPLY_ENTITY = void 0;
const common_1 = require("@nestjs/common");
const zod_1 = require("zod");
const prisma_service_1 = require("../../prisma/prisma.service");
const drafts_service_1 = require("../drafts/drafts.service");
const rules_1 = require("../../common/rules");
exports.REPLY_ENTITY = 'EnquiryReply';
const SECTION = 'Enquiries';
const replyPayloadSchema = zod_1.z.object({
    enquiryId: zod_1.z.string(),
    body: zod_1.z.string(),
    channels: zod_1.z.array(zod_1.z.enum(rules_1.NOTIFICATION_CHANNELS)).min(1),
    authorId: zod_1.z.string(),
    requested: zod_1.z.enum(['publish', 'draft']),
});
const replySnapshot = (tx, id) => tx.enquiryReply.findUnique({
    where: { id },
    select: { id: true, enquiryId: true, body: true, channels: true, status: true, sentAt: true },
});
let EnquiriesService = class EnquiriesService {
    constructor(prisma, drafts) {
        this.prisma = prisma;
        this.drafts = drafts;
    }
    onModuleInit() {
        this.drafts.register(exports.REPLY_ENTITY, {
            snapshot: replySnapshot,
            apply: async (tx, id, raw) => {
                if (id)
                    throw new common_1.BadRequestException('This reply has already been sent.');
                const payload = replyPayloadSchema.parse(raw);
                const enquiry = await tx.enquiry.findUnique({ where: { id: payload.enquiryId } });
                if (!enquiry)
                    throw new common_1.NotFoundException('Enquiry not found');
                const now = new Date();
                const reply = await tx.enquiryReply.create({
                    data: {
                        enquiryId: enquiry.id,
                        body: payload.body,
                        channels: payload.channels,
                        status: 'PUBLISHED',
                        authorId: payload.authorId,
                        sentAt: now,
                    },
                });
                await tx.notification.create({
                    data: { parentId: enquiry.parentId, type: 'ENQUIRY_REPLY', title: 'Reply to your enquiry', body: payload.body, channels: payload.channels },
                });
                if (enquiry.status === 'NEW')
                    await tx.enquiry.update({ where: { id: enquiry.id }, data: { status: 'IN_PROGRESS' } });
                return reply.id;
            },
        });
    }
    async list() {
        const [enquiries, pending] = await Promise.all([
            this.prisma.enquiry.findMany({
                include: { parent: { select: { name: true } }, replies: { orderBy: { createdAt: 'asc' } } },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.draftApproval.findMany({ where: { entityType: exports.REPLY_ENTITY, status: 'PENDING' }, orderBy: { createdAt: 'asc' } }),
        ]);
        const unsent = new Map();
        for (const d of pending) {
            const p = replyPayloadSchema.safeParse(d.after);
            if (!p.success)
                continue;
            const list = unsent.get(p.data.enquiryId) ?? [];
            list.push({
                id: d.id,
                body: p.data.body,
                channels: p.data.channels,
                status: p.data.requested === 'draft' ? 'DRAFT' : 'PENDING_APPROVAL',
                sentAt: null,
            });
            unsent.set(p.data.enquiryId, list);
        }
        const rows = enquiries.map((e) => ({
            id: e.id,
            parentName: e.parent.name,
            message: e.message,
            status: e.status,
            createdAt: e.createdAt.toISOString(),
            replies: [
                ...e.replies.map((r) => ({
                    id: r.id,
                    body: r.body,
                    channels: r.channels,
                    status: 'PUBLISHED',
                    sentAt: r.sentAt?.toISOString() ?? null,
                })),
                ...(unsent.get(e.id) ?? []),
            ],
        }));
        rows.sort((a, b) => Number(a.status === 'RESOLVED') - Number(b.status === 'RESOLVED'));
        return { rows };
    }
    async reply(admin, enquiryId, dto) {
        const enquiry = await this.prisma.enquiry.findUnique({ where: { id: enquiryId }, include: { parent: { select: { name: true } } } });
        if (!enquiry)
            throw new common_1.NotFoundException('Enquiry not found');
        return this.drafts.saveOrDraft({
            admin,
            mode: dto.mode,
            section: SECTION,
            entityType: exports.REPLY_ENTITY,
            entityId: null,
            payload: { enquiryId, body: dto.body, channels: dto.channels, authorId: admin.id, requested: dto.mode },
            label: `Reply to ${enquiry.parent.name}`,
        });
    }
};
exports.EnquiriesService = EnquiriesService;
exports.EnquiriesService = EnquiriesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        drafts_service_1.DraftsService])
], EnquiriesService);
//# sourceMappingURL=enquiries.service.js.map