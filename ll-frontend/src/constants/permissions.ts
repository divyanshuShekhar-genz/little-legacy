/**
 * Admin roles and section-permission keys. MUST match the backend's list in
 * ll-backend/src/common/rules/domain.ts — the backend enforces them (SectionGuard).
 */

export const ADMIN_ROLES = ['SUPER_ADMIN', 'SUB_ADMIN'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ROLE_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  SUB_ADMIN: 'Sub Admin',
};

/** Sections a Super Admin can assign to a Sub Admin (Team & Permissions checkboxes). */
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
