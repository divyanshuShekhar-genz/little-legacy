import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../../prisma/prisma.service';
import { DraftsService, type Tx } from '../drafts/drafts.service';
import { NOTIFICATION_CHANNELS } from '../../common/rules';
import type { SessionAdmin } from '../../common/types/session-admin';
import type { ReplyDto } from './dto/reply.dto';

/**
 * Enquiries (guide §17; prototype admin-rebuild.js `enquiryWorkspace`). One reply popup per
 * enquiry, sent by email, in-app notification, or both. No live chat.
 *
 * A reply goes through DraftsService.saveOrDraft(). Until it goes live it exists only as a
 * DraftApproval (no EnquiryReply row), so a rejected draft leaves nothing behind. The list shows
 * those pending drafts next to the sent replies. Going live happens in the handler's `apply()` —
 * immediately, or when Super Admin approves the draft later.
 */

export const REPLY_ENTITY = 'EnquiryReply';
const SECTION = 'Enquiries';

const replyPayloadSchema = z.object({
  enquiryId: z.string(),
  body: z.string(),
  channels: z.array(z.enum(NOTIFICATION_CHANNELS)).min(1),
  /** The draft's author. `apply()` gets no admin, and the reply is theirs even when approved later. */
  authorId: z.string(),
  /** 'draft' = "Save in draft"; 'publish' = Approve by someone who can't publish (awaiting approval). */
  requested: z.enum(['publish', 'draft']),
});
type ReplyPayload = z.infer<typeof replyPayloadSchema>;

export interface EnquiryRow {
  id: string;
  parentName: string;
  message: string;
  status: 'NEW' | 'IN_PROGRESS' | 'RESOLVED';
  createdAt: string;
  replies: {
    /** EnquiryReply id once sent; DraftApproval id while unpublished. */
    id: string;
    body: string;
    channels: ('EMAIL' | 'IN_APP')[];
    status: 'DRAFT' | 'PUBLISHED' | 'PENDING_APPROVAL';
    sentAt: string | null;
  }[];
}

const replySnapshot = (tx: Tx, id: string) =>
  tx.enquiryReply.findUnique({
    where: { id },
    select: { id: true, enquiryId: true, body: true, channels: true, status: true, sentAt: true },
  });

@Injectable()
export class EnquiriesService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly drafts: DraftsService,
  ) {}

  onModuleInit() {
    this.drafts.register<ReplyPayload>(REPLY_ENTITY, {
      snapshot: replySnapshot,
      apply: async (tx, id, raw) => {
        // Replies are sent once; a sent reply is never edited.
        if (id) throw new BadRequestException('This reply has already been sent.');
        const payload = replyPayloadSchema.parse(raw);
        const enquiry = await tx.enquiry.findUnique({ where: { id: payload.enquiryId } });
        if (!enquiry) throw new NotFoundException('Enquiry not found');

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
        // Delivered by the chosen channels once the email / push adapters exist (OPEN_QUESTIONS Q12).
        await tx.notification.create({
          data: { parentId: enquiry.parentId, type: 'ENQUIRY_REPLY', title: 'Reply to your enquiry', body: payload.body, channels: payload.channels },
        });
        // Nothing marks an enquiry RESOLVED yet: waiting on the client (OPEN_QUESTIONS Q17).
        if (enquiry.status === 'NEW') await tx.enquiry.update({ where: { id: enquiry.id }, data: { status: 'IN_PROGRESS' } });
        return reply.id;
      },
    });
  }

  /** Unresolved before resolved, newest first. */
  async list(): Promise<{ rows: EnquiryRow[] }> {
    const [enquiries, pending] = await Promise.all([
      this.prisma.enquiry.findMany({
        include: { parent: { select: { name: true } }, replies: { orderBy: { createdAt: 'asc' } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.draftApproval.findMany({ where: { entityType: REPLY_ENTITY, status: 'PENDING' }, orderBy: { createdAt: 'asc' } }),
    ]);

    const unsent = new Map<string, EnquiryRow['replies']>();
    for (const d of pending) {
      const p = replyPayloadSchema.safeParse(d.after);
      if (!p.success) continue;
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

    const rows: EnquiryRow[] = enquiries.map((e) => ({
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
          status: 'PUBLISHED' as const,
          sentAt: r.sentAt?.toISOString() ?? null,
        })),
        ...(unsent.get(e.id) ?? []),
      ],
    }));
    // Stable sort keeps newest-first within each group.
    rows.sort((a, b) => Number(a.status === 'RESOLVED') - Number(b.status === 'RESOLVED'));
    return { rows };
  }

  async reply(admin: SessionAdmin, enquiryId: string, dto: ReplyDto) {
    const enquiry = await this.prisma.enquiry.findUnique({ where: { id: enquiryId }, include: { parent: { select: { name: true } } } });
    if (!enquiry) throw new NotFoundException('Enquiry not found');
    return this.drafts.saveOrDraft<ReplyPayload>({
      admin,
      mode: dto.mode,
      section: SECTION,
      entityType: REPLY_ENTITY,
      entityId: null,
      payload: { enquiryId, body: dto.body, channels: dto.channels, authorId: admin.id, requested: dto.mode },
      label: `Reply to ${enquiry.parent.name}`,
    });
  }
}
