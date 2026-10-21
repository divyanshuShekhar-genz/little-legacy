import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DraftsService, type Tx } from '../drafts/drafts.service';
import { toJson } from '../../common/utils/json';
import { hasAnySection, type SessionAdmin } from '../../common/types/session-admin';
import { LIBRARY_ENTITY, type LibraryKind } from './library.service';
import type { CreateLibraryCategoryDto, DeleteLibraryCategoryDto, RenameLibraryCategoryDto } from './dto/library.dto';

/**
 * Story and rhyme categories (guide §14–15; API_REQUESTS #17): two separate lists (`kind`). Through
 * drafts, since parents see them (decision 4). Rename to another category's name merges the two;
 * delete of a category in use moves its content to a replacement first. Moves cover live items,
 * pending drafts (so a later approval doesn't fail on a vanished category) and parents' recorded
 * engagement (used by notification audiences).
 */

export const LIBRARY_CATEGORY_ENTITY = 'LibraryCategory';
const SECTION_OF = { STORY: 'stories', RHYME: 'rhymes' } as const;
const SECTION_NAME = { STORY: 'Stories', RHYME: 'Rhymes' } as const;

type CategoryPayload =
  | { action: 'create'; kind: LibraryKind; name: string }
  | { action: 'rename'; name: string }
  | { action: 'delete'; replacementId: string | null };

const snapshot = (tx: Tx, id: string) => tx.libraryCategory.findUnique({ where: { id }, select: { id: true, kind: true, name: true } });

const isAll = (name: string) => name.toLowerCase() === 'all';

/** Stories (or rhymes) using each category: live ones, plus pending changes and never-published drafts. */
async function usage(db: Tx, kind: LibraryKind) {
  const [items, drafts] = await Promise.all([
    db.libraryItem.findMany({ where: { kind }, select: { id: true, categoryId: true } }),
    db.draftApproval.findMany({ where: { entityType: LIBRARY_ENTITY, status: 'PENDING' }, select: { entityId: true, after: true } }),
  ]);
  const count = new Map<string, number>();
  const add = (id: string | null | undefined) => id && count.set(id, (count.get(id) ?? 0) + 1);
  for (const i of items) add(i.categoryId);
  for (const d of drafts) {
    const p = d.after as { kind?: string; content?: { categoryId?: string | null } };
    if (p.kind !== kind) continue;
    const live = d.entityId ? items.find((i) => i.id === d.entityId) : null;
    // A pending change to a live item counts once: only when it moves the item to another category.
    if (!live || live.categoryId !== p.content?.categoryId) add(p.content?.categoryId);
  }
  return count;
}

/** Moves everything that points at `fromId` to `toId`. */
async function moveContent(tx: Tx, fromId: string, toId: string) {
  await tx.libraryItem.updateMany({ where: { categoryId: fromId }, data: { categoryId: toId } });
  await tx.libraryEngagement.updateMany({ where: { categoryId: fromId }, data: { categoryId: toId } });
  const drafts = await tx.draftApproval.findMany({ where: { entityType: LIBRARY_ENTITY, status: 'PENDING' } });
  for (const d of drafts) {
    const p = d.after as { content?: { categoryId?: string | null } };
    if (p.content?.categoryId !== fromId) continue;
    await tx.draftApproval.update({ where: { id: d.id }, data: { after: toJson({ ...p, content: { ...p.content, categoryId: toId } }) ?? {} } });
  }
}

/** Another category of the same kind with this name (ignoring case), if any. */
const sameName = (db: Tx, kind: LibraryKind, name: string, excludeId: string | null) =>
  db.libraryCategory.findFirst({ where: { kind, name: { equals: name, mode: 'insensitive' }, ...(excludeId ? { id: { not: excludeId } } : {}) } });

/** Checks a delete; returns the replacement to move content to (null = nothing to move). */
async function checkDelete(db: Tx, category: { id: string; kind: LibraryKind }, replacementId: string | null) {
  const inUse = ((await usage(db, category.kind)).get(category.id) ?? 0) > 0;
  if (!inUse) return replacementId && replacementId !== category.id ? replacementId : null;
  const others = await db.libraryCategory.count({ where: { kind: category.kind, id: { not: category.id } } });
  if (!others) throw new BadRequestException('Create a replacement category first.');
  const replacement = replacementId ? await db.libraryCategory.findUnique({ where: { id: replacementId } }) : null;
  if (!replacement || replacement.kind !== category.kind || replacement.id === category.id) {
    throw new BadRequestException('Choose a category to move this content to.');
  }
  return replacement.id;
}

@Injectable()
export class LibraryCategoriesService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly drafts: DraftsService,
  ) {}

  onModuleInit() {
    this.drafts.register<CategoryPayload>(LIBRARY_CATEGORY_ENTITY, {
      snapshot,
      apply: async (tx, id, p) => {
        if (p.action === 'create') {
          if (await sameName(tx, p.kind, p.name, null)) throw new ConflictException('This category already exists.');
          return (await tx.libraryCategory.create({ data: { kind: p.kind, name: p.name } })).id;
        }
        const category = id ? await tx.libraryCategory.findUnique({ where: { id } }) : null;
        if (!category) throw new NotFoundException('Category not found');
        if (p.action === 'rename') {
          const target = await sameName(tx, category.kind, p.name, category.id);
          if (!target) {
            await tx.libraryCategory.update({ where: { id: category.id }, data: { name: p.name } });
            return category.id;
          }
          // "Rename or merge": its content joins the existing category, and this one goes.
          await moveContent(tx, category.id, target.id);
          await tx.libraryCategory.delete({ where: { id: category.id } });
          return target.id;
        }
        const moveTo = await checkDelete(tx, category, p.replacementId);
        if (moveTo) await moveContent(tx, category.id, moveTo);
        await tx.libraryCategory.delete({ where: { id: category.id } });
        return category.id;
      },
    });
  }

  private assertCanManage(admin: SessionAdmin, kind: LibraryKind) {
    if (!hasAnySection(admin, [SECTION_OF[kind]])) throw new ForbiddenException('You do not have access to this section');
  }

  private async category(id: string) {
    const category = await this.prisma.libraryCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  /** Read: Stories / Rhymes, or Notifications for its story and rhyme filters (API_REQUESTS open ask (d)). Changes still need Stories / Rhymes. */
  async list(admin: SessionAdmin, kind: LibraryKind) {
    if (!hasAnySection(admin, [SECTION_OF[kind], 'notifications'])) throw new ForbiddenException('You do not have access to this section');
    const [categories, counts] = await Promise.all([
      this.prisma.libraryCategory.findMany({ where: { kind }, orderBy: { name: 'asc' } }),
      usage(this.prisma, kind),
    ]);
    return { rows: categories.map((c) => ({ id: c.id, kind: c.kind, name: c.name, itemCount: counts.get(c.id) ?? 0 })) };
  }

  async create(admin: SessionAdmin, dto: CreateLibraryCategoryDto) {
    this.assertCanManage(admin, dto.kind);
    if (!dto.name || isAll(dto.name)) throw new BadRequestException('Enter a category name other than All.');
    if (await sameName(this.prisma, dto.kind, dto.name, null)) throw new ConflictException('This category already exists.');
    return this.drafts.saveOrDraft<CategoryPayload>({ admin, mode: dto.mode, section: SECTION_NAME[dto.kind], entityType: LIBRARY_CATEGORY_ENTITY, entityId: null, payload: { action: 'create', kind: dto.kind, name: dto.name }, label: `New category: ${dto.name}` });
  }

  async rename(admin: SessionAdmin, id: string, dto: RenameLibraryCategoryDto) {
    const category = await this.category(id);
    this.assertCanManage(admin, category.kind);
    if (!dto.name || isAll(dto.name)) throw new BadRequestException('Enter a category name.');
    const target = await sameName(this.prisma, category.kind, dto.name, category.id);
    const result = await this.drafts.saveOrDraft<CategoryPayload>({
      admin,
      mode: dto.mode,
      section: SECTION_NAME[category.kind],
      entityType: LIBRARY_CATEGORY_ENTITY,
      entityId: id,
      payload: { action: 'rename', name: dto.name },
      label: target ? `Merge category ${category.name} into ${target.name}` : `Rename category ${category.name} to ${dto.name}`,
    });
    return { ...result, merged: Boolean(target) };
  }

  async remove(admin: SessionAdmin, id: string, dto: DeleteLibraryCategoryDto) {
    const category = await this.category(id);
    this.assertCanManage(admin, category.kind);
    await checkDelete(this.prisma, category, dto.replacementId ?? null);
    return this.drafts.saveOrDraft<CategoryPayload>({ admin, mode: dto.mode, section: SECTION_NAME[category.kind], entityType: LIBRARY_CATEGORY_ENTITY, entityId: id, payload: { action: 'delete', replacementId: dto.replacementId ?? null }, label: `Delete category ${category.name}` });
  }
}
