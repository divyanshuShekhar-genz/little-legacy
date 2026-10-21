/**
 * Demo shop — development only: the client prototype's two kits with their India prices and
 * stock (docs/prototype/content-commerce.md → Seed data). Seeded as Draft: publishing needs an
 * image, which staff add through the upload picker. Skipped if any product exists.
 * Then the prototype's two orders (#1001 Meera, Paid; #1002 Priya, Dispatched). Skipped if any order exists.
 */
import type { PrismaClient } from '@prisma/client';

const PRODUCTS = [
  { sku: 'LL-DISCOVERY-KIT', title: 'Little discovery kit', inr: 499, stock: 24 },
  { sku: 'LL-CREATIVE-KIT', title: 'Creative moments kit', inr: 699, stock: 12 },
];

export async function seedDemoCommerce(prisma: PrismaClient) {
  if (await prisma.product.count()) return;
  for (const p of PRODUCTS) {
    await prisma.product.create({
      data: { sku: p.sku, title: p.title, category: 'Kits', stock: p.stock, status: 'DRAFT', prices: { create: { countryCode: 'IN', amount: p.inr } } },
    });
  }
  console.log(`✔ Demo shop: ${PRODUCTS.length} products (Draft, India prices)`);
}

const ORDERS = [
  { number: 1001, email: 'meera@example.com', sku: 'LL-DISCOVERY-KIT', quantity: 1, status: 'PAID', trackingRef: null, city: 'Bengaluru', phone: '+91 98450 00001', at: '2026-10-02T10:15:00Z' },
  { number: 1002, email: 'priya@example.com', sku: 'LL-CREATIVE-KIT', quantity: 2, status: 'DISPATCHED', trackingRef: 'LL-102', city: 'Mumbai', phone: '+91 98200 00002', at: '2026-10-03T14:40:00Z' },
] as const;

export async function seedDemoOrders(prisma: PrismaClient) {
  if (await prisma.order.count()) return;
  const india = await prisma.country.findUnique({ where: { code: 'IN' } });
  if (!india) return;
  let created = 0;
  for (const o of ORDERS) {
    const parent = await prisma.parent.findUnique({ where: { email: o.email } });
    const product = await prisma.product.findUnique({ where: { sku: o.sku }, include: { prices: { where: { countryCode: 'IN' } } } });
    const price = product?.prices[0]?.amount;
    if (!parent || !product || price === undefined) continue;
    const subtotal = price.mul(o.quantity);
    await prisma.order.create({
      data: {
        number: o.number,
        parentId: parent.id,
        countryCode: india.code,
        currency: india.currency,
        subtotal,
        deliveryCharge: india.deliveryCharge,
        total: subtotal.add(india.deliveryCharge),
        status: o.status,
        address: { recipient: parent.name, line1: '12 Garden Lane', line2: null, city: o.city, state: null, postcode: '560001', phone: o.phone },
        trackingRef: o.trackingRef,
        createdAt: new Date(o.at),
        items: { create: { productId: product.id, titleSnapshot: product.title, unitPrice: price, quantity: o.quantity } },
      },
    });
    created++;
  }
  // Numbers were given explicitly: move the sequence past them so real orders don't collide.
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('orders', 'number'), (SELECT COALESCE(MAX(number), 1) FROM orders))`);
  if (created) console.log(`✔ Demo orders: ${created} (#1001 Paid, #1002 Dispatched)`);
}
