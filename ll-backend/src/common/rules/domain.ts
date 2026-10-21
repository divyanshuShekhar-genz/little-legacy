/**
 * Domain vocabulary shared by the admin panel and the API.
 * Values mirror the client's "Little Legacy Admin and Mobile App Guide" (see docs/PRODUCT_SPEC.md).
 */

export const ADMIN_ROLES = ['SUPER_ADMIN', 'SUB_ADMIN'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

/**
 * Permission keys a Super Admin can assign to a Sub Admin.
 * Team & Permissions and Audit History are Super Admin only and are never assignable.
 */
export const PERMISSION_SECTIONS = [
  'overview',
  'users',
  'childLearning',
  'community',
  'feedback',
  'activityReviews',
  'enquiries',
  'developmentalMilestones',
  'questionnairesLevels',
  'activities',
  'activityProgression',
  'assessmentRules',
  'skillPersonalisation',
  'stories',
  'rhymes',
  'appContent',
  'parentChecklist',
  'subscriptions',
  'memories',
  'shopOrders',
  'notifications',
] as const;
export type PermissionSection = (typeof PERMISSION_SECTIONS)[number];

export const PLAN_TIERS = ['FREE', 'PLUS', 'PREMIUM'] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];

/** Rank for "minimum plan" gates: a plan grants its tier and everything below. */
export const PLAN_RANK: Record<PlanTier, number> = { FREE: 0, PLUS: 1, PREMIUM: 2 };

export const QUESTION_DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const;
export type QuestionDifficulty = (typeof QUESTION_DIFFICULTIES)[number];

/** Parent's answer to "How did your little one complete this activity?" */
export const COMPLETION_OUTCOMES = ['INDEPENDENT', 'WITH_HELP', 'NOT_COMPLETED'] as const;
export type CompletionOutcome = (typeof COMPLETION_OUTCOMES)[number];

/** Progression engine outcome after a completion (Activity Flow §9). */
export const PROGRESSION_OUTCOMES = ['STRONG', 'DEVELOPING', 'NEEDS_SUPPORT'] as const;
export type ProgressionOutcome = (typeof PROGRESSION_OUTCOMES)[number];

/** Lifecycle of publishable content (stories, activities, replies, static text...). */
export const CONTENT_STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'REJECTED', 'WITHDRAWN'] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const COMMUNITY_POST_STATUSES = [
  'AWAITING_MODERATION',
  'DRAFT',
  'PUBLISHED',
  'REJECTED',
  'EXPIRED',
] as const;
export type CommunityPostStatus = (typeof COMMUNITY_POST_STATUSES)[number];

export const ENQUIRY_STATUSES = ['NEW', 'IN_PROGRESS', 'RESOLVED'] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export const ORDER_STATUSES = ['PAID', 'PACKED', 'DISPATCHED', 'DELIVERED', 'CANCELLED', 'REFUNDED'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const NOTIFICATION_CHANNELS = ['EMAIL', 'IN_APP'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

/**
 * Country restrictions (guide §20, prototype country-access.js). Matches Prisma's RestrictionType.
 * Section types block a whole area of the parent app; ACTIVITY / LEVEL block one item.
 * `section` = the admin permission needed to manage rules of that type.
 */
export const RESTRICTION_TYPES = {
  ACTIVITIES_SECTION: { label: 'Activities section', scope: 'section', section: 'developmentalMilestones' },
  ACTIVITY: { label: 'Activity', scope: 'item', section: 'developmentalMilestones' },
  LEVEL: { label: 'Level', scope: 'item', section: 'developmentalMilestones' },
  STORIES: { label: 'Stories', scope: 'section', section: 'stories' },
  RHYMES: { label: 'Rhymes', scope: 'section', section: 'rhymes' },
  COMMUNITY: { label: 'Community', scope: 'section', section: 'community' },
  ECOMMERCE: { label: 'Ecommerce', scope: 'section', section: 'shopOrders' },
} as const satisfies Record<string, { label: string; scope: 'section' | 'item'; section: PermissionSection }>;
export type RestrictionType = keyof typeof RESTRICTION_TYPES;
export const RESTRICTION_TYPE_KEYS = Object.keys(RESTRICTION_TYPES) as RestrictionType[];

export const DEFAULT_DEVELOPMENT_AREAS = ['Cognitive', 'Physical', 'Emotional', 'Social', 'Creative'] as const;
