import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { SaveResult } from './community';
import { invalidateCommerce, toPrices } from './plans';
import type { SaveMode } from '@/components/DecisionActions';
import { useAuth } from '@/hooks/useAuth';
import type { Product, ProductContent } from '@/views/commerce/data';

/**
 * Shop products (docs/API_REQUESTS.md #21), Shop & Orders only. Every save sends the whole product
 * and goes through drafts, with one pending change per product (as Stories). A never-published
 * product's id is its draft's id until the first publish returns the real id. Archived =
 * WITHDRAWN; there is no delete. Amounts arrive as strings and are turned into numbers here.
 */
export const productKeys = { all: ['products'] as const };

type ContentRow = Omit<ProductContent, 'images' | 'prices'> & { images: { url: string }[]; prices: Record<string, string> };
interface ProductRow extends Omit<Product, 'prices' | 'pending'> {
  prices: Record<string, string>;
  pending: { status: 'DRAFT' | 'PENDING_APPROVAL'; content: ContentRow; draftId: string } | null;
}

const toProduct = (p: ProductRow): Product => ({
  ...p,
  prices: toPrices(p.prices),
  pending: p.pending && {
    ...p.pending,
    content: {
      ...p.pending.content,
      // A pending change's images are only URLs, in order.
      images: p.pending.content.images.map((img, i) => ({ id: null, url: img.url, position: i + 1 })),
      prices: toPrices(p.pending.content.prices),
    },
  },
});

/** Only fetched with Shop & Orders, so nobody gets a 403 for a half they can't see. */
export function useProducts() {
  const { can } = useAuth();
  return useQuery({
    queryKey: productKeys.all,
    queryFn: async () => (await api.get<{ products: ProductRow[] }>('/products')).data.products.map(toProduct),
    enabled: can('shopOrders'),
  });
}

/** The body the API takes: the whole product, images as URLs in order (the first is the cover). */
const body = (mode: SaveMode, c: ProductContent) => ({
  mode,
  title: c.title,
  sku: c.sku,
  category: c.category,
  ageRecommendation: c.ageRecommendation,
  description: c.description,
  details: c.details,
  materials: c.materials,
  stock: c.stock,
  status: c.status,
  images: [...c.images].sort((a, b) => a.position - b.position).map((img) => ({ url: img.url })),
  prices: c.prices,
});

export function useSaveProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, mode, content }: { id?: string; mode: SaveMode; content: ProductContent }) =>
      id
        ? (await api.patch<SaveResult>(`/products/${id}`, body(mode, content))).data
        : (await api.post<SaveResult>('/products', body(mode, content))).data,
    onSuccess: () => invalidateCommerce(qc),
  });
}

/**
 * The editor's Reject (Super Admin), for a change waiting for approval: a live product's change
 * is discarded (`rejected`); a never-published product goes back to Draft (`draft`).
 */
export function useRejectProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await api.post<{ status: 'rejected'; id: string } | { status: 'draft'; draftId: string }>(`/products/${id}/reject`, {})).data,
    onSuccess: () => invalidateCommerce(qc),
  });
}
