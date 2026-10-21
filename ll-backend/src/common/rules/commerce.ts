import type { OrderStatus } from './domain';

/** Shop rules (guide §20). Prices are per country and entered manually — never converted. */

export interface CartLine {
  unitPrice: number;
  quantity: number;
}

/** One delivery charge per order, not per item. Tax policy is not yet defined. */
export function orderTotal(lines: CartLine[], deliveryCharge: number) {
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  return { subtotal, delivery: deliveryCharge, total: subtotal + deliveryCharge };
}

/** A missing price makes the product unavailable in that country; 0 is a valid intentional price. */
export function isPurchasable(countryPrice: number | null | undefined): boolean {
  return countryPrice !== null && countryPrice !== undefined;
}

/** Cancelled and Refunded orders are closed (API_REQUESTS #22, decision 2). */
export const isClosedOrder = (status: OrderStatus) => status === 'CANCELLED' || status === 'REFUNDED';

/**
 * An order status change (API_REQUESTS #22, decisions 1–2):
 * - open statuses (Paid, Packed, Dispatched, Delivered) move freely between each other, so staff
 *   can correct a wrong click;
 * - closed statuses are final, except Cancelled → Refunded;
 * - closing an order that was Paid or Packed puts its items back in stock (the kit never left);
 *   from Dispatched or Delivered it doesn't (the kit is with the courier or the parent).
 */
export function orderStatusChange(from: OrderStatus, to: OrderStatus): { allowed: boolean; restock: boolean } {
  if (from === to) return { allowed: true, restock: false };
  if (isClosedOrder(from)) return { allowed: from === 'CANCELLED' && to === 'REFUNDED', restock: false };
  return { allowed: true, restock: isClosedOrder(to) && (from === 'PAID' || from === 'PACKED') };
}
