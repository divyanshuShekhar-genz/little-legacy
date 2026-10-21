/**
 * Subscription plans, lowest first. MUST match PLAN_TIERS in ll-backend/src/common/rules/domain.ts
 * (Prisma enum PlanTier). Content is available when the child's plan is ≥ its minimum plan.
 */
export const PLAN_TIERS = ['FREE', 'PLUS', 'PREMIUM'] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];

export const PLAN_LABELS: Record<PlanTier, string> = { FREE: 'Free', PLUS: 'Plus', PREMIUM: 'Premium' };
