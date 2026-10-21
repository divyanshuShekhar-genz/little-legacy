import { BadRequestException, ConflictException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { DraftsService, type SaveResult, type Tx } from '../drafts/drafts.service';
import { toJson } from '../../common/utils/json';
import { canPublish, type SessionAdmin } from '../../common/types/session-admin';
import { toAmount } from '../plans/plans.service';
import type { ProductDto } from './dto/product.dto';

/**
 * Shop products (guide §20; API_REQUESTS #21). Stock is shared across countries; prices are per
 * country, entered by hand and NEVER converted (missing = not for sale there, 0 = free). The first
 * image is the cover. "Archived" = WITHDRAWN: no longer sold; past orders keep their copy of the
 * price, so products are never deleted.
 *
 * Decisions 2026-10-14 (as Stories): one pending change per product; a never-published product
 * lives in Draft approvals and its id is the draft's id; the editor's Reject discards a published
 * product's change or returns a never-published one to Draft. SKU unique ignoring case across live
 * products AND never-published drafts. "Edit prices": drafts build on the pending change, direct
 * publishes start from the live product.
 */

export const PRODUCT_ENTITY = 'Product';
const SECTION = 'Shop & Orders';

export interface ProductContent {
  title: string;
  sku: string;
  category: string | null;
  ageRecommendation: string | null;
  description: string | null;
  details: string | null;
  materials: string | null;
  stock: number;
  /** Availability: Draft / Published / Archived (WITHDRAWN). */
  status: 'DRAFT' | 'PUBLISHED' | 'WITHDRAWN';
  images: { url: string }[];
  prices: Record<string, string>;
}
interface ProductPayload {
  requested: 'publish' | 'draft';
  content: ProductContent;
}

const sortedPrices = (prices: Record<string, string>) => Object.fromEntries(Object.entries(prices).sort(([a], [b]) => a.localeCompare(b)));
const pendingStatus = (p: ProductPayload) => (p.requested === 'draft' ? ('DRAFT' as const) : ('PENDING_APPROVAL' as const));

async function liveContent(db: Tx, id: string): Promise<(ProductContent & { id: string }) | null> {
  const p = await db.product.findUnique({ where: { id }, include: { images: { orderBy: { position: 'asc' } }, prices: true } });
  if (!p) return null;
  return {
    id: p.id,
    title: p.title,
    sku: p.sku,
    category: p.category,
    ageRecommendation: p.ageRecommendation,
    description: p.description,
    details: p.details,
    materials: p.materials,
    stock: p.stock,
    status: p.status as ProductContent['status'],
    images: p.images.map((i) => ({ url: i.url })),
    prices: sortedPrices(Object.fromEntries(p.prices.map((x) => [x.countryCode, x.amount.toFixed(2)]))),
  };
}

/**
 * #21 checks, in order. `ownDraftId` / `productId` are excluded from the SKU check. The
 * "Published needs an image and a price" rule applies when the change would go live as Published.
 */
async function validate(db: Tx, c: ProductContent, opts: { productId: string | null; ownDraftId: string | null; goingLive: boolean; checkDrafts?: boolean }) {
  if (!c.title) throw new BadRequestException('Enter a product title.');
  if (!c.sku) throw new BadRequestException('Enter a SKU.');
  const live = await db.product.findFirst({ where: { sku: { equals: c.sku, mode: 'insensitive' }, ...(opts.productId ? { id: { not: opts.productId } } : {}) } });
  // Other never-published drafts are checked when saving (an early warning). When a draft is
  // applied only live products count: of two drafts with one SKU, the first approval wins.
  const drafts = opts.checkDrafts === false ? [] : await db.draftApproval.findMany({ where: { entityType: PRODUCT_ENTITY, entityId: null, status: 'PENDING', ...(opts.ownDraftId ? { id: { not: opts.ownDraftId } } : {}) } });
  if (live || drafts.some((d) => (d.after as unknown as ProductPayload).content.sku.toLowerCase() === c.sku.toLowerCase())) {
    throw new ConflictException('SKU must be unique.');
  }
  if (!Number.isInteger(c.stock) || c.stock < 0 || c.stock > 2_147_483_647) throw new BadRequestException('Stock must be a non-negative whole number.');
  const codes = Object.keys(c.prices);
  if (codes.length && (await db.country.count({ where: { code: { in: codes } } })) !== codes.length) throw new BadRequestException('Choose a country.');
  if (opts.goingLive && c.status === 'PUBLISHED' && (c.images.length === 0 || codes.length === 0)) {
    throw new BadRequestException('Add an image and at least one country price before publishing.');
  }
  const urls = [...new Set(c.images.map((i) => i.url))];
  if (urls.length && (await db.upload.count({ where: { url: { in: urls }, kind: 'IMAGE' } })) < urls.length) {
    throw new BadRequestException('Use an image uploaded with the image picker.');
  }
}

@Injectable()
export class ProductsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly drafts: DraftsService,
    private readonly audit: AuditService,
  ) {}

  onModuleInit() {
    this.drafts.register<ProductPayload>(PRODUCT_ENTITY, {
      snapshot: liveContent,
      apply: async (tx, id, { content: c }) => {
        await validate(tx, c, { productId: id, ownDraftId: null, goingLive: true, checkDrafts: false });
        const data = {
          title: c.title,
          sku: c.sku,
          category: c.category,
          ageRecommendation: c.ageRecommendation,
          description: c.description,
          details: c.details,
          materials: c.materials,
          stock: c.stock,
          status: c.status,
        };
        const productId = id ? (await tx.product.update({ where: { id }, data })).id : (await tx.product.create({ data })).id;
        await tx.productImage.deleteMany({ where: { productId } });
        await tx.productImage.createMany({ data: c.images.map((img, position) => ({ productId, url: img.url, position })) });
        await tx.productPrice.deleteMany({ where: { productId, countryCode: { notIn: Object.keys(c.prices) } } });
        for (const [countryCode, amount] of Object.entries(c.prices)) {
          await tx.productPrice.upsert({
            where: { productId_countryCode: { productId, countryCode } },
            update: { amount },
            create: { productId, countryCode, amount },
          });
        }
        return productId;
      },
    });
  }

  /** A live product (+ its pending draft) or a never-published one (its draft id). */
  private async resolve(id: string) {
    const live = await liveContent(this.prisma, id);
    if (live) {
      const pending = await this.prisma.draftApproval.findFirst({ where: { entityType: PRODUCT_ENTITY, entityId: id, status: 'PENDING' }, orderBy: { createdAt: 'desc' } });
      return { live, pending };
    }
    const draft = await this.prisma.draftApproval.findUnique({ where: { id } });
    if (draft && draft.entityType === PRODUCT_ENTITY && draft.entityId === null && draft.status === 'PENDING') return { live: null, pending: draft };
    throw new NotFoundException('Product not found');
  }

  async list() {
    const [products, drafts, items] = await Promise.all([
      this.prisma.product.findMany({ include: { images: { orderBy: { position: 'asc' } }, prices: true }, orderBy: { title: 'asc' } }),
      this.prisma.draftApproval.findMany({ where: { entityType: PRODUCT_ENTITY, status: 'PENDING' }, orderBy: { createdAt: 'desc' } }),
      // "Quantity ordered" leaves out cancelled and refunded orders (prototype productOrderedQuantity).
      this.prisma.orderItem.findMany({ where: { order: { status: { notIn: ['CANCELLED', 'REFUNDED'] } } }, select: { productId: true, quantity: true, order: { select: { countryCode: true } } } }),
    ]);
    const ordered = (productId: string) => {
      const byCountry: Record<string, number> = {};
      for (const i of items.filter((x) => x.productId === productId)) byCountry[i.order.countryCode] = (byCountry[i.order.countryCode] ?? 0) + i.quantity;
      return byCountry;
    };
    const asContent = (d: (typeof drafts)[number]) => d.after as unknown as ProductPayload;
    const imagesOf = (c: ProductContent) => c.images.map((img, position) => ({ id: null, url: img.url, position }));

    return {
      products: [
        ...products.map((p) => {
          const draft = drafts.find((d) => d.entityId === p.id);
          return {
            id: p.id,
            sku: p.sku,
            title: p.title,
            category: p.category,
            ageRecommendation: p.ageRecommendation,
            description: p.description,
            details: p.details,
            materials: p.materials,
            stock: p.stock,
            status: p.status,
            images: p.images.map((i) => ({ id: i.id, url: i.url, position: i.position })),
            prices: sortedPrices(Object.fromEntries(p.prices.map((x) => [x.countryCode, x.amount.toFixed(2)]))),
            orderedByCountry: ordered(p.id),
            pending: draft ? { status: pendingStatus(asContent(draft)), content: asContent(draft).content, draftId: draft.id } : null,
          };
        }),
        // Never published: the draft is the product (its asked-for status lives in `pending.content`).
        ...drafts
          .filter((d) => d.entityId === null)
          .map((d) => {
            const c = asContent(d).content;
            return {
              id: d.id,
              sku: c.sku,
              title: c.title,
              category: c.category,
              ageRecommendation: c.ageRecommendation,
              description: c.description,
              details: c.details,
              materials: c.materials,
              stock: c.stock,
              status: pendingStatus(asContent(d)),
              images: imagesOf(c),
              prices: c.prices,
              orderedByCountry: {},
              pending: { status: pendingStatus(asContent(d)), content: c, draftId: d.id },
            };
          }),
      ],
    };
  }

  private content(dto: ProductDto): ProductContent {
    return {
      title: dto.title,
      sku: dto.sku,
      category: dto.category ?? null,
      ageRecommendation: dto.ageRecommendation ?? null,
      description: dto.description ?? null,
      details: dto.details ?? null,
      materials: dto.materials ?? null,
      stock: typeof dto.stock === 'string' && dto.stock.trim() !== '' ? Number(dto.stock) : (dto.stock as number),
      status: dto.status,
      images: dto.images.map((i) => ({ url: i.url })),
      prices: sortedPrices(Object.fromEntries(Object.entries(dto.prices).map(([code, v]) => [code.toUpperCase(), toAmount(v, 'Prices must be zero or greater.')]))),
    };
  }

  /** POST (id null) / PATCH: the whole product, one pending change per product. */
  async save(admin: SessionAdmin, id: string | null, dto: ProductDto) {
    const target = id ? await this.resolve(id) : { live: null, pending: null };
    const content = this.content(dto);
    await validate(this.prisma, content, { productId: target.live?.id ?? null, ownDraftId: target.live ? null : (target.pending?.id ?? null), goingLive: dto.mode === 'publish' });
    return this.drafts.saveOrDraft<ProductPayload>({
      admin,
      mode: dto.mode,
      section: SECTION,
      entityType: PRODUCT_ENTITY,
      entityId: target.live?.id ?? null,
      payload: { requested: dto.mode, content },
      label: `${content.title} (${content.sku})`,
      pendingDraftId: target.pending?.id ?? null,
    });
  }

  /** The editor's Reject (Super Admin): as Stories. */
  async reject(admin: SessionAdmin, id: string, reason: string | null) {
    const { live, pending } = await this.resolve(id);
    if (!pending || (pending.after as unknown as ProductPayload).requested !== 'publish') {
      throw new BadRequestException('There is no change waiting for approval.');
    }
    if (live) {
      await this.drafts.reject(admin, pending.id, reason ?? 'Rejected in the editor.');
      return { status: 'rejected' as const, id: live.id };
    }
    const payload = pending.after as unknown as ProductPayload;
    await this.prisma.$transaction(async (tx) => {
      await tx.draftApproval.update({ where: { id: pending.id }, data: { after: toJson({ ...payload, requested: 'draft' }) ?? {} } });
      await this.audit.write(admin, { action: `Returned to draft: ${SECTION} · ${payload.content.title}${reason ? ` (${reason})` : ''}`, section: SECTION, entityType: PRODUCT_ENTITY }, tx);
    });
    return { status: 'draft' as const, draftId: pending.id };
  }

  /**
   * One product's price in one country, for "Edit prices" (null = not for sale there). Returns null
   * when nothing changes. A draft builds on the pending change; a direct publish starts from the
   * live product and leaves any pending change alone (decision 4). Runs in the caller's transaction
   * (`tx`), so the whole "Edit prices" request saves or fails together.
   * A never-published product (its id is its draft's id) is skipped: it isn't for sale anywhere yet,
   * and its prices are set in the product editor.
   */
  async countryPrice(
    tx: Tx,
    admin: SessionAdmin,
    country: { code: string; name: string },
    productId: string,
    value: number | string | null,
    mode: 'publish' | 'draft',
  ): Promise<SaveResult | null> {
    const { code } = country;
    const live = await liveContent(tx, productId);
    if (!live) {
      const unpublished = await tx.draftApproval.count({ where: { id: productId, entityType: PRODUCT_ENTITY, entityId: null, status: 'PENDING' } });
      if (unpublished) return null;
      throw new NotFoundException('Product not found');
    }
    const pending = await tx.draftApproval.findFirst({ where: { entityType: PRODUCT_ENTITY, entityId: productId, status: 'PENDING' }, orderBy: { createdAt: 'desc' } });
    const direct = mode === 'publish' && canPublish(admin);
    const { id: _id, ...liveFields } = live;
    const from: ProductContent = !direct && pending ? (pending.after as unknown as ProductPayload).content : liveFields;
    const prices = { ...from.prices };
    if (value === null) delete prices[code];
    else prices[code] = toAmount(value, 'Enter prices of zero or more.');
    if (JSON.stringify(sortedPrices(prices)) === JSON.stringify(sortedPrices(from.prices))) return null;
    const content: ProductContent = { ...from, prices: sortedPrices(prices) };
    await validate(tx, content, { productId, ownDraftId: null, goingLive: mode === 'publish' });
    return this.drafts.saveOrDraft<ProductPayload>({
      admin,
      mode,
      section: SECTION,
      entityType: PRODUCT_ENTITY,
      entityId: productId,
      payload: { requested: mode, content },
      label: `${content.title} price for ${country.name}`,
      pendingDraftId: direct ? null : (pending?.id ?? null),
      tx,
    });
  }
}
