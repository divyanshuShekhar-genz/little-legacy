import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { Order, OrderAddress, OrderStatus } from '@/views/commerce/data';

/**
 * Shop orders (docs/API_REQUESTS.md #22), Shop & Orders only. Orders come from the parent app;
 * staff only update status, tracking and the delivery address. Updates apply directly, not as
 * drafts (OPEN_QUESTIONS Q31): each is audited and notifies the parent. Amounts arrive as strings
 * ("1398.00") and are turned into numbers here. The list isn't paged, so the screen filters it.
 */
export const orderKeys = { all: ['orders'] as const };

type Amount = string | number;
interface OrderRow extends Omit<Order, 'subtotal' | 'deliveryCharge' | 'total' | 'items'> {
  subtotal: Amount;
  deliveryCharge: Amount;
  total: Amount;
  items: (Omit<Order['items'][number], 'unitPrice'> & { unitPrice: Amount })[];
}

const toOrder = (o: OrderRow): Order => ({
  ...o,
  subtotal: Number(o.subtotal),
  deliveryCharge: Number(o.deliveryCharge),
  total: Number(o.total),
  items: o.items.map((i) => ({ ...i, unitPrice: Number(i.unitPrice) })),
});

/** Newest first (the API's order). */
export function useOrders() {
  return useQuery({
    queryKey: orderKeys.all,
    queryFn: async () => (await api.get<{ orders: OrderRow[] }>('/orders')).data.orders.map(toOrder),
  });
}

/** Only the fields that changed: fields left out keep their value; a null tracking field clears it. */
export interface OrderChange {
  status?: OrderStatus;
  trackingRef?: string | null;
  trackingUrl?: string | null;
  /** Sent whole. */
  address?: OrderAddress;
}

export function useUpdateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, change }: { id: string; change: OrderChange }) =>
      toOrder((await api.patch<{ order: OrderRow }>(`/orders/${id}`, change)).data.order),
    // Closing a Paid or Packed order returns its items to stock, and orders feed "Quantity ordered".
    onSuccess: () => {
      for (const key of ['orders', 'products', 'audit']) void qc.invalidateQueries({ queryKey: [key] });
    },
  });
}
