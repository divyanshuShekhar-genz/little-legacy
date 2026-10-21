import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { isClosedOrder, orderStatusChange, type OrderStatus } from '../../common/rules';
import type { SessionAdmin } from '../../common/types/session-admin';
import type { ListOrdersDto, UpdateOrderDto } from './dto/order.dto';

/**
 * Shop orders (guide §20; API_REQUESTS #22). Orders come from the parent app; staff only fulfil
 * them: status, tracking and the delivery address. Amounts, items and prices paid never change.
 *
 * Decisions 2026-10-15:
 * 1. Closing an order (Cancelled / Refunded) that was Paid or Packed puts its items back in stock;
 *    from Dispatched or Delivered it doesn't (`orderStatusChange()`).
 * 2. Open statuses move freely between each other; Cancelled and Refunded are final, except
 *    Cancelled → Refunded.
 * 3. The address can be edited while the order is open; a closed order can't be edited at all.
 * 4. Updates apply directly, not as drafts (OPEN_QUESTIONS Q31), for anyone with Shop & Orders.
 *    Every real change is audited and notifies the parent by email and in-app; a save that
 *    changes nothing does neither.
 * Refunded is a status only: no money moves. Totals exclude tax (Q11).
 */

const SECTION = 'Shop & Orders';
const CLOSED = "This order is closed and can't be changed.";

const STATUS_LABEL: Record<OrderStatus, string> = {
  PAID: 'Paid',
  PACKED: 'Packed',
  DISPATCHED: 'Dispatched',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

export interface OrderAddress {
  recipient: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postcode: string;
  phone: string;
}

const include = {
  parent: { select: { name: true, email: true } },
  items: { orderBy: { id: 'asc' } },
} satisfies Prisma.OrderInclude;

type OrderWithItems = Prisma.OrderGetPayload<{ include: typeof include }>;

/** Order.address as the API shape, whatever the stored JSON holds. */
function toAddress(raw: unknown): OrderAddress {
  const a = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const text = (v: unknown) => (typeof v === 'string' ? v : '');
  const optional = (v: unknown) => (typeof v === 'string' && v.trim() ? v : null);
  return {
    recipient: text(a.recipient),
    line1: text(a.line1),
    line2: optional(a.line2),
    city: text(a.city),
    state: optional(a.state),
    postcode: text(a.postcode),
    phone: text(a.phone),
  };
}

function toRow(o: OrderWithItems) {
  return {
    id: o.id,
    number: o.number,
    parentName: o.parent.name,
    parentEmail: o.parent.email,
    countryCode: o.countryCode,
    currency: o.currency,
    subtotal: o.subtotal.toFixed(2),
    deliveryCharge: o.deliveryCharge.toFixed(2),
    total: o.total.toFixed(2),
    status: o.status,
    address: toAddress(o.address),
    trackingRef: o.trackingRef,
    trackingUrl: o.trackingUrl,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    items: o.items.map((i) => ({ id: i.id, productId: i.productId, titleSnapshot: i.titleSnapshot, unitPrice: i.unitPrice.toFixed(2), quantity: i.quantity })),
  };
}

const sameAddress = (a: OrderAddress, b: OrderAddress) => (Object.keys(a) as (keyof OrderAddress)[]).every((k) => a[k] === b[k]);

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Newest first. `search` matches the order number ("1001" or "#1001"), parent name or email, and product titles. */
  async list(query: ListOrdersDto) {
    const where: Prisma.OrderWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.country) where.countryCode = query.country.toUpperCase();
    const search = query.search?.trim();
    if (search) {
      const number = /^#?\d{1,9}$/.test(search) ? Number(search.replace('#', '')) : null;
      where.OR = [
        ...(number !== null ? [{ number }] : []),
        { parent: { name: { contains: search, mode: 'insensitive' } } },
        { parent: { email: { contains: search, mode: 'insensitive' } } },
        { items: { some: { titleSnapshot: { contains: search, mode: 'insensitive' } } } },
      ];
    }
    const orders = await this.prisma.order.findMany({ where, include, orderBy: [{ createdAt: 'desc' }, { number: 'desc' }] });
    return { orders: orders.map(toRow) };
  }

  async get(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, include });
    if (!order) throw new NotFoundException('Order not found');
    return { order: toRow(order) };
  }

  async update(admin: SessionAdmin, id: string, dto: UpdateOrderDto) {
    const order = await this.prisma.order.findUnique({ where: { id }, include });
    if (!order) throw new NotFoundException('Order not found');

    const before = toRow(order);
    const status = dto.status ?? order.status;
    const trackingRef = dto.trackingRef !== undefined ? dto.trackingRef : order.trackingRef;
    const trackingUrl = dto.trackingUrl !== undefined ? dto.trackingUrl : order.trackingUrl;
    const address: OrderAddress = dto.address
      ? {
          recipient: dto.address.recipient,
          line1: dto.address.line1,
          line2: dto.address.line2 ?? null,
          city: dto.address.city,
          state: dto.address.state ?? null,
          postcode: dto.address.postcode,
          phone: dto.address.phone ?? '',
        }
      : before.address;

    const changed = {
      status: status !== order.status,
      tracking: trackingRef !== order.trackingRef || trackingUrl !== order.trackingUrl,
      address: !sameAddress(address, before.address),
    };
    if (!changed.status && !changed.tracking && !changed.address) return { order: before }; // nothing to save, notify or audit

    // Decisions 2–3: a closed order is final, except Cancelled → Refunded with nothing else changed.
    const rule = orderStatusChange(order.status, status);
    if (!rule.allowed || (isClosedOrder(order.status) && (changed.tracking || changed.address))) throw new BadRequestException(CLOSED);

    const updated = await this.prisma.$transaction(async (tx) => {
      // Only if nobody else changed the status meanwhile, so stock is never returned twice.
      const { count } = await tx.order.updateMany({
        where: { id, status: order.status },
        data: { status, trackingRef, trackingUrl, address: { ...address } },
      });
      if (count === 0) throw new ConflictException('This order was just changed by someone else. Close it and open it again.');

      // Decision 1: the kit never left the shelf.
      if (rule.restock) {
        for (const item of order.items) await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
      }

      // Delivered by email and in-app once the adapters exist (OPEN_QUESTIONS Q12).
      await tx.notification.create({
        data: {
          parentId: order.parentId,
          type: 'ORDER_UPDATE',
          title: `Order #${order.number} update`,
          body: this.message(order.number, status, trackingRef, trackingUrl, changed),
          channels: ['EMAIL', 'IN_APP'],
          route: `orders/${order.id}`,
        },
      });

      const after = await tx.order.findUniqueOrThrow({ where: { id }, include });
      const row = toRow(after);
      const what = [changed.status && STATUS_LABEL[status], changed.tracking && 'tracking', changed.address && 'address'].filter(Boolean).join(', ');
      await this.audit.write(
        admin,
        {
          action: `Updated order #${order.number}: ${what}${rule.restock ? ' (items returned to stock)' : ''}`,
          section: SECTION,
          entityType: 'Order',
          entityId: order.id,
          before: { status: before.status, trackingRef: before.trackingRef, trackingUrl: before.trackingUrl, address: before.address },
          after: { status: row.status, trackingRef: row.trackingRef, trackingUrl: row.trackingUrl, address: row.address },
        },
        tx,
      );
      return row;
    });
    return { order: updated };
  }

  /** The parent's notification: the new status first, then the address, then tracking (last, so a link ends it). */
  private message(number: number, status: OrderStatus, trackingRef: string | null, trackingUrl: string | null, changed: { status: boolean; tracking: boolean; address: boolean }) {
    const parts = [changed.status ? `Your order #${number} is now ${STATUS_LABEL[status]}.` : `Your order #${number} has been updated.`];
    if (changed.address) parts.push('Your delivery address has been updated.');
    if (changed.tracking) {
      const tracking = [trackingRef, trackingUrl].filter(Boolean).join(' · ');
      parts.push(tracking ? `Tracking: ${tracking}` : 'The tracking details have been removed.');
    }
    return parts.join(' ');
  }
}
