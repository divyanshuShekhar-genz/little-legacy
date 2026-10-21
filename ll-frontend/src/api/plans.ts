import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { SaveResult } from './community';
import type { SaveMode } from '@/components/DecisionActions';
import type { PlanTier } from '@/constants/plans';
import { useAuth } from '@/hooks/useAuth';
import type { Plan, Prices } from '@/views/commerce/data';

/**
 * Plans and country prices (docs/API_REQUESTS.md #20). Reading needs Subscriptions or Memories;
 * changing needs Subscriptions. One pending change per plan. Free is always active and free, so
 * only its memory allowance is ever sent. Amounts arrive as strings ("199.00") and are turned into
 * numbers here, for formatMoney and the inputs.
 */
export const planKeys = { all: ['plans'] as const };

/** "199.00" → 199 (a missing country stays missing: not purchasable there). */
export const toPrices = (prices: Record<string, string | number>): Prices =>
  Object.fromEntries(Object.entries(prices).map(([code, amount]) => [code, Number(amount)]));

interface PlanRow extends Omit<Plan, 'prices' | 'pending'> {
  prices: Record<string, string>;
  pending: { status: 'DRAFT' | 'PENDING_APPROVAL'; content: { active: boolean; memoryLimit: number | null; prices: Record<string, string> }; draftId: string } | null;
}

const toPlan = (p: PlanRow): Plan => ({
  ...p,
  prices: toPrices(p.prices),
  pending: p.pending && { ...p.pending, content: { ...p.pending.content, prices: toPrices(p.pending.content.prices) } },
});

/** A save can change plans, products (country prices) and the drafts list. */
export function invalidateCommerce(qc: QueryClient) {
  for (const key of ['plans', 'products', 'drafts']) void qc.invalidateQueries({ queryKey: [key] });
}

/** Only fetched for admins who can read plans, so nobody gets a 403 for a half they can't see. */
export function usePlans() {
  const { can } = useAuth();
  return useQuery({
    queryKey: planKeys.all,
    queryFn: async () => (await api.get<{ plans: PlanRow[] }>('/plans')).data.plans.map(toPlan),
    enabled: can('subscriptions') || can('memories'),
  });
}

/** Free: memory allowance only (it is always active and free). Others: status, allowance and the full price map. */
export type PlanInput = { memoryLimit: number | null } | { active: boolean; memoryLimit: number | null; prices: Prices };

export function useSavePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tier, mode, input }: { tier: PlanTier; mode: SaveMode; input: PlanInput }) =>
      (await api.patch<SaveResult>(`/plans/${tier}`, { mode, ...input })).data,
    onSuccess: () => invalidateCommerce(qc),
  });
}

/** Super Admin rejects a plan's change waiting for approval, through Draft approvals (a reason is required). */
export function useRejectPlanChange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ draftId, reason }: { draftId: string; reason: string }) => api.post(`/drafts/${draftId}/reject`, { reason }),
    onSuccess: () => invalidateCommerce(qc),
  });
}

/**
 * "Edit prices · {country}": plans (Subscriptions) and products (Shop & Orders) in one request.
 * null = not purchasable there. Each changed plan or product is saved as its own change;
 * `items: []` means nothing changed.
 */
export function useSaveCountryPrices() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ code, ...body }: { code: string; mode: SaveMode; plans?: Partial<Record<PlanTier, number | null>>; products?: Record<string, number | null> }) =>
      (await api.put<{ status: 'published' | 'draft'; items: SaveResult[] }>(`/countries/${code}/prices`, body)).data,
    onSuccess: () => invalidateCommerce(qc),
  });
}
