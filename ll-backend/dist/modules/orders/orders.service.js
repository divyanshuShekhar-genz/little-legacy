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
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const rules_1 = require("../../common/rules");
const SECTION = 'Shop & Orders';
const CLOSED = "This order is closed and can't be changed.";
const STATUS_LABEL = {
    PAID: 'Paid',
    PACKED: 'Packed',
    DISPATCHED: 'Dispatched',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
    REFUNDED: 'Refunded',
};
const include = {
    parent: { select: { name: true, email: true } },
    items: { orderBy: { id: 'asc' } },
};
function toAddress(raw) {
    const a = (raw && typeof raw === 'object' ? raw : {});
    const text = (v) => (typeof v === 'string' ? v : '');
    const optional = (v) => (typeof v === 'string' && v.trim() ? v : null);
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
function toRow(o) {
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
const sameAddress = (a, b) => Object.keys(a).every((k) => a[k] === b[k]);
let OrdersService = class OrdersService {
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async list(query) {
        const where = {};
        if (query.status)
            where.status = query.status;
        if (query.country)
            where.countryCode = query.country.toUpperCase();
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
    async get(id) {
        const order = await this.prisma.order.findUnique({ where: { id }, include });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        return { order: toRow(order) };
    }
    async update(admin, id, dto) {
        const order = await this.prisma.order.findUnique({ where: { id }, include });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        const before = toRow(order);
        const status = dto.status ?? order.status;
        const trackingRef = dto.trackingRef !== undefined ? dto.trackingRef : order.trackingRef;
        const trackingUrl = dto.trackingUrl !== undefined ? dto.trackingUrl : order.trackingUrl;
        const address = dto.address
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
        if (!changed.status && !changed.tracking && !changed.address)
            return { order: before };
        const rule = (0, rules_1.orderStatusChange)(order.status, status);
        if (!rule.allowed || ((0, rules_1.isClosedOrder)(order.status) && (changed.tracking || changed.address)))
            throw new common_1.BadRequestException(CLOSED);
        const updated = await this.prisma.$transaction(async (tx) => {
            const { count } = await tx.order.updateMany({
                where: { id, status: order.status },
                data: { status, trackingRef, trackingUrl, address: { ...address } },
            });
            if (count === 0)
                throw new common_1.ConflictException('This order was just changed by someone else. Close it and open it again.');
            if (rule.restock) {
                for (const item of order.items)
                    await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
            }
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
            await this.audit.write(admin, {
                action: `Updated order #${order.number}: ${what}${rule.restock ? ' (items returned to stock)' : ''}`,
                section: SECTION,
                entityType: 'Order',
                entityId: order.id,
                before: { status: before.status, trackingRef: before.trackingRef, trackingUrl: before.trackingUrl, address: before.address },
                after: { status: row.status, trackingRef: row.trackingRef, trackingUrl: row.trackingUrl, address: row.address },
            }, tx);
            return row;
        });
        return { order: updated };
    }
    message(number, status, trackingRef, trackingUrl, changed) {
        const parts = [changed.status ? `Your order #${number} is now ${STATUS_LABEL[status]}.` : `Your order #${number} has been updated.`];
        if (changed.address)
            parts.push('Your delivery address has been updated.');
        if (changed.tracking) {
            const tracking = [trackingRef, trackingUrl].filter(Boolean).join(' · ');
            parts.push(tracking ? `Tracking: ${tracking}` : 'The tracking details have been removed.');
        }
        return parts.join(' ');
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map