import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { DraftsService, type Tx } from '../drafts/drafts.service';
import { toJson } from '../../common/utils/json';
import type { PlanTier } from '../../common/rules';
import type { SessionAdmin } from '../../common/types/session-admin';
import type { LibraryItemDto } from './dto/library.dto';

/**
 * Stories and Rhymes (guide §14–15; API_REQUESTS #17, #18). One shared model: LibraryItem (kind)
 * → chapters → pages → stacked images. A rhyme has exactly one chapter (checked here).
 *
 * Decisions 2026-10-14:
 * 1. Unpublished work lives in Draft approvals, ONE pending draft per item, updated in place
 *    (saveOrDraft `pendingDraftId`). A never-published item's id is its draft's id; a draft can
 *    lack a category or chapters, which a LibraryItem row can't. A direct publish closes the draft.
 * 2. The editor's Reject: a published item's pending change is discarded; a never-published item
 *    goes back to Draft with its content kept.
 * 3. Chapters, pages and images are updated in place by id. A chapter children have read can't be
 *    removed (reading history is a child record).
 * 6. Covers, page images, chapter music and rhyme media must be files from POST /api/uploads.
 * No delete or withdraw (OPEN_QUESTIONS Q29).
 */

export const LIBRARY_ENTITY = 'LibraryItem';
export type LibraryKind = 'STORY' | 'RHYME';

export const KIND_WORDS = {
  STORY: { section: 'Stories', title: 'Enter a story title.', notFound: 'Story not found' },
  RHYME: { section: 'Rhymes', title: 'Enter a rhyme title.', notFound: 'Rhyme not found' },
} as const;

export interface LibraryContent {
  title: string;
  categoryId: string | null;
  coverUrl: string | null;
  description: string | null;
  minimumPlan: PlanTier;
  mediaUrl: string | null;
  lyrics: string | null;
  chapters: {
    id: string | null;
    position: number;
    title: string;
    musicUrl: string | null;
    pages: { id: string | null; position: number; description: string | null; images: { id: string | null; position: number; imageUrl: string }[] }[];
  }[];
}
interface LibraryPayload {
  kind: LibraryKind;
  /** 'draft' = "Save in draft" (status DRAFT); 'publish' = waiting for approval (PENDING_APPROVAL). */
  requested: 'publish' | 'draft';
  content: LibraryContent;
}

const TREE = {
  chapters: { orderBy: { position: 'asc' as const }, include: { pages: { orderBy: { position: 'asc' as const }, include: { images: { orderBy: { position: 'asc' as const } } } } } },
};
type ItemTree = Prisma.LibraryItemGetPayload<{ include: typeof TREE }>;

function toContent(item: ItemTree): LibraryContent {
  return {
    title: item.title,
    categoryId: item.categoryId,
    coverUrl: item.coverUrl,
    description: item.description,
    minimumPlan: item.minimumPlan,
    mediaUrl: item.mediaUrl,
    lyrics: item.lyrics,
    chapters: item.chapters.map((c) => ({
      id: c.id,
      position: c.position,
      title: c.title,
      musicUrl: c.musicUrl,
      pages: c.pages.map((p) => ({
        id: p.id,
        position: p.position,
        description: p.description,
        images: p.images.map((i) => ({ id: i.id, position: i.position, imageUrl: i.imageUrl })),
      })),
    })),
  };
}

const snapshot = async (tx: Tx, id: string) => {
  const item = await tx.libraryItem.findUnique({ where: { id }, include: TREE });
  return item && { id: item.id, kind: item.kind, status: item.status, ...toContent(item) };
};

const pendingStatus = (p: LibraryPayload) => (p.requested === 'draft' ? ('DRAFT' as const) : ('PENDING_APPROVAL' as const));

/** Files must come from POST /api/uploads, of the right kind (decision 6). */
async function checkUploads(db: Tx, kind: LibraryKind, c: LibraryContent) {
  const images = [c.coverUrl, ...c.chapters.flatMap((ch) => ch.pages.flatMap((p) => p.images.map((i) => i.imageUrl)))].filter((u): u is string => Boolean(u));
  const music = c.chapters.map((ch) => ch.musicUrl).filter((u): u is string => Boolean(u));
  const media = kind === 'RHYME' && c.mediaUrl ? [c.mediaUrl] : [];
  const urls = [...new Set([...images, ...music, ...media])];
  const uploads = urls.length ? await db.upload.findMany({ where: { url: { in: urls } }, select: { url: true, kind: true } }) : [];
  const kindOf = (url: string) => uploads.find((u) => u.url === url)?.kind;
  if (images.some((u) => kindOf(u) !== 'IMAGE')) throw new BadRequestException('Use an image uploaded with the image picker.');
  if (music.some((u) => kindOf(u) !== 'AUDIO')) throw new BadRequestException('Choose an audio file for the chapter music.');
  if (media.some((u) => kindOf(u) !== 'AUDIO' && kindOf(u) !== 'VIDEO')) throw new BadRequestException('Choose an audio or video file.');
}

/** #17 / #18 checks, in order. "Save in draft" needs only a title (and a valid category if one is chosen). */
async function validate(db: Tx, kind: LibraryKind, c: LibraryContent, mode: 'publish' | 'draft') {
  if (!c.title.trim()) throw new BadRequestException(KIND_WORDS[kind].title);
  if (c.categoryId) {
    const category = await db.libraryCategory.findUnique({ where: { id: c.categoryId } });
    if (!category || category.kind !== kind) throw new BadRequestException('Choose a category.');
  }
  if (mode === 'draft') return;
  if (kind === 'RHYME' && c.chapters.length !== 1) throw new BadRequestException('Each rhyme must have exactly one chapter.');
  if (!c.categoryId) throw new BadRequestException('Choose a category.');
  if (c.chapters.length === 0 || c.chapters.some((ch) => !ch.title.trim() || ch.pages.length === 0)) {
    throw new BadRequestException('Every chapter needs a name and at least one page.');
  }
  await checkUploads(db, kind, c);
}

/** Writes the published tree, updating rows in place by id (decision 3). */
async function writeTree(tx: Tx, itemId: string, c: LibraryContent, existing: ItemTree | null) {
  const own = {
    chapters: new Set(existing?.chapters.map((x) => x.id) ?? []),
    pages: new Set(existing?.chapters.flatMap((x) => x.pages.map((p) => p.id)) ?? []),
    images: new Set(existing?.chapters.flatMap((x) => x.pages.flatMap((p) => p.images.map((i) => i.id))) ?? []),
  };
  const isOwn = (set: Set<string>, id: string | null): id is string => id !== null && set.has(id);

  // A chapter children have read can't be removed: their reading history points at it.
  const keptChapters = new Set(c.chapters.map((ch) => ch.id).filter((id) => isOwn(own.chapters, id)));
  const removed = [...own.chapters].filter((id) => !keptChapters.has(id));
  if (removed.length && (await tx.readingHistory.count({ where: { chapterId: { in: removed } } }))) {
    throw new BadRequestException("Children have read this chapter, so it can't be removed.");
  }

  const keptPages: string[] = [];
  const keptImages: string[] = [];
  for (const [ci, ch] of c.chapters.entries()) {
    const chapterData = { position: ci + 1, title: ch.title.trim(), musicUrl: ch.musicUrl };
    const chapterId = isOwn(own.chapters, ch.id)
      ? (await tx.libraryChapter.update({ where: { id: ch.id }, data: chapterData })).id
      : (await tx.libraryChapter.create({ data: { ...chapterData, itemId } })).id;
    for (const [pi, page] of ch.pages.entries()) {
      const pageData = { chapterId, position: pi + 1, description: page.description };
      const pageId = isOwn(own.pages, page.id)
        ? (await tx.libraryPage.update({ where: { id: page.id }, data: pageData })).id
        : (await tx.libraryPage.create({ data: pageData })).id;
      keptPages.push(pageId);
      for (const [ii, image] of page.images.entries()) {
        const imageData = { pageId, position: ii + 1, imageUrl: image.imageUrl };
        const imageId = isOwn(own.images, image.id)
          ? (await tx.libraryPageImage.update({ where: { id: image.id }, data: imageData })).id
          : (await tx.libraryPageImage.create({ data: imageData })).id;
        keptImages.push(imageId);
      }
    }
  }
  await tx.libraryPageImage.deleteMany({ where: { page: { chapter: { itemId } }, id: { notIn: keptImages } } });
  await tx.libraryPage.deleteMany({ where: { chapter: { itemId }, id: { notIn: keptPages } } });
  if (removed.length) await tx.libraryChapter.deleteMany({ where: { id: { in: removed } } });
}

@Injectable()
export class LibraryService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly drafts: DraftsService,
    private readonly audit: AuditService,
  ) {}

  onModuleInit() {
    this.drafts.register<LibraryPayload>(LIBRARY_ENTITY, {
      snapshot,
      apply: async (tx, id, { kind, content }) => {
        await validate(tx, kind, content, 'publish');
        const data = {
          kind,
          title: content.title.trim(),
          categoryId: content.categoryId!,
          coverUrl: content.coverUrl,
          description: content.description,
          minimumPlan: content.minimumPlan,
          mediaUrl: kind === 'RHYME' ? content.mediaUrl : null,
          lyrics: kind === 'RHYME' ? content.lyrics : null,
          status: 'PUBLISHED' as const,
        };
        if (!id) {
          const created = await tx.libraryItem.create({ data });
          await writeTree(tx, created.id, content, null);
          return created.id;
        }
        const existing = await tx.libraryItem.findUnique({ where: { id }, include: TREE });
        if (!existing || existing.kind !== kind) throw new NotFoundException(KIND_WORDS[kind].notFound);
        await tx.libraryItem.update({ where: { id }, data });
        await writeTree(tx, id, content, existing);
        return id;
      },
    });
  }

  /** A published item (+ its pending draft) or a never-published one (its draft id). */
  private async resolve(kind: LibraryKind, id: string) {
    const item = await this.prisma.libraryItem.findUnique({ where: { id }, include: TREE });
    if (item && item.kind === kind) {
      const pending = await this.prisma.draftApproval.findFirst({ where: { entityType: LIBRARY_ENTITY, entityId: id, status: 'PENDING' }, orderBy: { createdAt: 'desc' } });
      return { item, pending };
    }
    const draft = await this.prisma.draftApproval.findUnique({ where: { id } });
    if (draft && draft.entityType === LIBRARY_ENTITY && draft.entityId === null && draft.status === 'PENDING' && (draft.after as unknown as LibraryPayload).kind === kind) {
      return { item: null, pending: draft };
    }
    throw new NotFoundException(KIND_WORDS[kind].notFound);
  }

  /** Every item of a kind: published ones and never-published drafts, newest first. */
  async list(kind: LibraryKind) {
    const [items, drafts, categories] = await Promise.all([
      this.prisma.libraryItem.findMany({ where: { kind }, include: { _count: { select: { chapters: true } } } }),
      this.prisma.draftApproval.findMany({ where: { entityType: LIBRARY_ENTITY, status: 'PENDING' }, orderBy: { createdAt: 'desc' } }),
      this.prisma.libraryCategory.findMany({ where: { kind }, select: { id: true, name: true } }),
    ]);
    const nameOf = (id: string | null) => categories.find((c) => c.id === id)?.name ?? null;
    const payloadOf = (d: (typeof drafts)[number]) => d.after as unknown as LibraryPayload;
    const ofKind = drafts.filter((d) => payloadOf(d).kind === kind);

    const rows = [
      ...items.map((i) => {
        const pending = ofKind.find((d) => d.entityId === i.id);
        return {
          id: i.id,
          title: i.title,
          categoryId: i.categoryId,
          categoryName: nameOf(i.categoryId),
          chapterCount: i._count.chapters,
          status: i.status as 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED',
          pendingStatus: pending ? pendingStatus(payloadOf(pending)) : null,
          minimumPlan: i.minimumPlan,
          updatedAt: i.updatedAt.toISOString(),
        };
      }),
      ...ofKind
        .filter((d) => d.entityId === null)
        .map((d) => {
          const { content } = payloadOf(d);
          return {
            id: d.id,
            title: content.title,
            categoryId: content.categoryId,
            categoryName: nameOf(content.categoryId),
            chapterCount: content.chapters.length,
            status: pendingStatus(payloadOf(d)),
            pendingStatus: null,
            minimumPlan: content.minimumPlan,
            updatedAt: d.createdAt.toISOString(),
          };
        }),
    ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return { rows };
  }

  async get(kind: LibraryKind, id: string) {
    const { item, pending } = await this.resolve(kind, id);
    const payload = pending ? (pending.after as unknown as LibraryPayload) : null;
    if (!item) {
      // Never published: the draft is the item.
      return { id, status: pendingStatus(payload!), ...payload!.content, pending: null, draftId: pending!.id };
    }
    return {
      id: item.id,
      status: item.status,
      ...toContent(item),
      pending: payload ? { status: pendingStatus(payload), content: payload.content } : null,
      draftId: pending?.id ?? null,
    };
  }

  private content(kind: LibraryKind, dto: LibraryItemDto): LibraryContent {
    return {
      title: dto.title,
      categoryId: dto.categoryId ?? null,
      coverUrl: dto.coverUrl ?? null,
      description: dto.description ?? null,
      minimumPlan: dto.minimumPlan,
      mediaUrl: kind === 'RHYME' ? (dto.mediaUrl ?? null) : null,
      lyrics: kind === 'RHYME' ? (dto.lyrics ?? null) : null,
      chapters: dto.chapters.map((ch, ci) => ({
        id: ch.id ?? null,
        position: ci + 1,
        title: ch.title,
        musicUrl: ch.musicUrl ?? null,
        pages: ch.pages.map((p, pi) => ({
          id: p.id ?? null,
          position: pi + 1,
          description: p.description ?? null,
          images: p.images.map((img, ii) => ({ id: img.id ?? null, position: ii + 1, imageUrl: img.imageUrl })),
        })),
      })),
    };
  }

  /** POST (id null) / PATCH: the whole item. One pending draft per item (decision 1). */
  async save(admin: SessionAdmin, kind: LibraryKind, id: string | null, dto: LibraryItemDto) {
    const target = id ? await this.resolve(kind, id) : { item: null, pending: null };
    const content = this.content(kind, dto);
    await validate(this.prisma, kind, content, dto.mode);
    return this.drafts.saveOrDraft<LibraryPayload>({
      admin,
      mode: dto.mode,
      section: KIND_WORDS[kind].section,
      entityType: LIBRARY_ENTITY,
      entityId: target.item?.id ?? null,
      payload: { kind, requested: dto.mode, content },
      label: content.title.trim(),
      pendingDraftId: target.pending?.id ?? null,
    });
  }

  /**
   * The editor's Reject (Super Admin, decision 2): only a change waiting for approval. A published
   * item's change is discarded; a never-published item goes back to Draft, content kept.
   */
  async reject(admin: SessionAdmin, kind: LibraryKind, id: string, reason: string | null) {
    const { item, pending } = await this.resolve(kind, id);
    if (!pending || (pending.after as unknown as LibraryPayload).requested !== 'publish') {
      throw new BadRequestException('There is no change waiting for approval.');
    }
    if (item) {
      await this.drafts.reject(admin, pending.id, reason ?? 'Rejected in the editor.');
      return { status: 'rejected' as const, id: item.id };
    }
    const payload = pending.after as unknown as LibraryPayload;
    await this.prisma.$transaction(async (tx) => {
      await tx.draftApproval.update({ where: { id: pending.id }, data: { after: toJson({ ...payload, requested: 'draft' }) ?? {} } });
      await this.audit.write(admin, { action: `Returned to draft: ${KIND_WORDS[kind].section} · ${payload.content.title}${reason ? ` (${reason})` : ''}`, section: KIND_WORDS[kind].section, entityType: LIBRARY_ENTITY }, tx);
    });
    return { status: 'draft' as const, draftId: pending.id };
  }
}
