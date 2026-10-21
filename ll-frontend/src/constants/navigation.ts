import type { PermissionSection } from '@/constants/permissions';

/**
 * Single source of truth for the sidebar, hub pages, routes and section permissions.
 * Mirrors the client prototype's nav groups (workspace.js). Add a section here first,
 * then register its page component in PAGES in App.tsx.
 */

/** 'superAdmin' sections are never assignable to a Sub Admin. */
export type SectionAccess = PermissionSection | 'superAdmin' | 'any';

export interface NavSection {
  label: string;
  path: string;
  access: SectionAccess;
  /** One-line description shown on hub cards. */
  description?: string;
  /** Where the requirements live (docs/PRODUCT_SPEC.md § / docs/prototype/*). */
  spec?: string;
}

export interface NavGroup {
  label: string;
  /** Subtitle for the hub page (groups with more than one section). */
  hubSubtitle?: string;
  /** Group landing path. A group with >1 section renders a hub page of cards. */
  path: string;
  sections: NavSection[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    path: '/',
    sections: [{ label: 'Overview', path: '/', access: 'overview', spec: 'Guide §4' }],
  },
  {
    label: 'User Management',
    hubSubtitle: 'Open a section to manage families, conversations, feedback and plans.',
    path: '/users',
    sections: [
      { label: 'Registered Users', path: '/users/parents', access: 'users', description: 'Parent accounts and their child profiles.', spec: 'Guide §4' },
      { label: 'Children & Learning', path: '/users/children', access: 'childLearning', description: 'Questionnaire results, activity marks and repetitions — read only.', spec: 'Guide §4, §7' },
      { label: 'Community', path: '/users/community', access: 'community', description: 'Moderate parent messages and post team messages.', spec: 'Guide §16' },
      { label: 'Feedback', path: '/users/feedback', access: 'feedback', description: 'Parent notes and satisfaction from activity reviews.' },
      { label: 'Activity Reviews', path: '/users/activity-reviews', access: 'activityReviews', description: 'Recorded outcomes — records, not an approval queue.', spec: 'Guide §4' },
      { label: 'Enquiries', path: '/users/enquiries', access: 'enquiries', description: 'Reply by email, in-app notification, or both.', spec: 'Guide §17' },
    ],
  },
  {
    label: 'Activity Management',
    hubSubtitle: 'Development areas, their questionnaires, categories, levels and activities — per regional learning category.',
    path: '/activity-management',
    sections: [
      { label: 'Developmental Milestones', path: '/activity-management/milestones', access: 'developmentalMilestones', description: 'Areas → categories → levels → activities, per age.', spec: 'Guide §5, §9' },
      { label: 'Questionnaires & Levels', path: '/activity-management/questionnaires', access: 'questionnairesLevels', description: 'Per-area MCQs, difficulty and level thresholds.', spec: 'Guide §6' },
      { label: 'Activities', path: '/activity-management/activities', access: 'activities', description: 'Activity registry across all areas.', spec: 'Guide §9, §12' },
      { label: 'Activity Progression', path: '/activity-management/progression', access: 'activityProgression', description: 'Development Bases, weekly limits, pending policy, activity difficulty levels.', spec: 'Activity Flow §1–19' },
      { label: 'Assessment Rules', path: '/activity-management/assessment-rules', access: 'assessmentRules', description: 'Formulas, area weights and mandatory sets by age.', spec: 'Guide §8, §11' },
      { label: 'Skill Personalisation', path: '/activity-management/skills', access: 'skillPersonalisation', description: 'Skills, answer mapping and expected scores.', spec: 'Guide §10' },
      // Not a prototype section: region management moved out of the milestones filter panel. Shares the milestones permission.
      { label: 'Regional learning categories', path: '/activity-management/regions', access: 'developmentalMilestones', description: 'Group countries into learning categories, each with its own catalogue.', spec: 'Guide §5 · CP §1–3' },
    ],
  },
  {
    label: 'Stories',
    path: '/stories',
    sections: [{ label: 'Stories', path: '/stories', access: 'stories', spec: 'Guide §14' }],
  },
  {
    label: 'Rhymes',
    path: '/rhymes',
    sections: [{ label: 'Rhymes', path: '/rhymes', access: 'rhymes', spec: 'Guide §15' }],
  },
  {
    label: 'App Content',
    path: '/app-content',
    sections: [{ label: 'App Content', path: '/app-content', access: 'appContent', description: 'Terms, Privacy, Help and page FAQs — versioned.', spec: 'Guide §22' }],
  },
  {
    label: 'Plans & Commerce',
    hubSubtitle: 'One country list for subscription and product prices. Memory storage is included in the subscription.',
    path: '/commerce',
    sections: [
      { label: 'Subscriptions', path: '/commerce/subscriptions', access: 'subscriptions', description: 'Per-child plan prices by country and memory allowances.', spec: 'Guide §19' },
      { label: 'Memories', path: '/commerce/memories', access: 'memories', description: 'Memory items allowed per plan (read only).', spec: 'Guide §19' },
      { label: 'Shop & Orders', path: '/commerce/shop', access: 'shopOrders', description: 'Products, countries & delivery, orders.', spec: 'Guide §20' },
    ],
  },
  {
    label: 'Notifications',
    path: '/notifications',
    sections: [{ label: 'Notifications', path: '/notifications', access: 'notifications', spec: 'Guide §18' }],
  },
  {
    label: 'Team & Permissions',
    path: '/team',
    sections: [{ label: 'Team & Permissions', path: '/team', access: 'superAdmin', spec: 'Guide §2' }],
  },
  {
    label: 'Audit History',
    path: '/audit',
    sections: [{ label: 'Audit History', path: '/audit', access: 'superAdmin', spec: 'Guide §23' }],
  },
  {
    label: 'Parent Checklist',
    path: '/parent-checklist',
    sections: [{ label: 'Parent Checklist', path: '/parent-checklist', access: 'parentChecklist', description: 'Week 1, Week 2 and later-week checklists.', spec: 'Guide §22' }],
  },
  {
    label: 'Draft approvals',
    path: '/drafts',
    sections: [{ label: 'Draft approvals', path: '/drafts', access: 'any', spec: 'Guide §2' }],
  },
];

export const ALL_SECTIONS = NAV_GROUPS.flatMap((g) => g.sections);

/**
 * Human labels for the permission checkboxes on Team & Permissions. A permission can cover several
 * sections (Regional learning categories uses Developmental Milestones'); the first one names it.
 */
export const PERMISSION_LABELS: Record<PermissionSection, string> = Object.fromEntries(
  ALL_SECTIONS.filter((s): s is NavSection & { access: PermissionSection } => s.access !== 'superAdmin' && s.access !== 'any')
    .filter((s, i, all) => all.findIndex((x) => x.access === s.access) === i)
    .map((s) => [s.access, s.label]),
) as Record<PermissionSection, string>;
