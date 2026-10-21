/**
 * Notification campaigns (guide §18, PRODUCT_SPEC §17), on the API (docs/API_REQUESTS.md #23,
 * src/api/campaigns.ts). Types follow the API's shapes: Prisma `Campaign` and `Notification`.
 */
import type { PlanTier } from '@/constants/plans';

export type Channel = 'EMAIL' | 'IN_APP';
export const CHANNEL_LABELS: Record<Channel, string> = { EMAIL: 'Email', IN_APP: 'In-app notification' };
export const channelText = (channels: Channel[]) => channels.map((c) => CHANNEL_LABELS[c]).join(' + ');

/**
 * A child's gender, for the audience filter (Q25, client answer 15 Oct; CR7). **To confirm with the
 * client:** these values and labels, and whether parents may leave it unset. Children with no gender
 * recorded match only "All".
 */
export const CHILD_GENDERS = ['GIRL', 'BOY'] as const;
export type ChildGender = (typeof CHILD_GENDERS)[number];
export const GENDER_LABELS: Record<ChildGender, string> = { GIRL: 'Girl', BOY: 'Boy' };

/**
 * The Gender filter is hidden, and `gender` never sent, until the API supports it: #23 has no
 * gender filter yet and silently drops one it's sent, which would give a wrong count
 * (FRONTEND_BACKLOG CR7). Switch on when the backend adds `Child.gender` and the filter.
 */
export const GENDER_FILTER_ENABLED = false;

/**
 * Campaign.filters (Prisma Json). Every field left out means "All"; the ones given combine with
 * AND. Region and area are the child's; country is the **parent's** (Q36).
 */
export interface CampaignFilters {
  regionIds?: string[];
  countryCodes?: string[];
  areaId?: string;
  /** The child's content age: the age group whose content they get (Q36). */
  age?: number;
  /** Q25 (CR7); not sent until the API supports it (`GENDER_FILTER_ENABLED`). */
  gender?: ChildGender;
  /** A child's current level in `areaId` (only with an area). */
  level?: number;
  plan?: PlanTier;
  storyCategoryId?: string;
  rhymeCategoryId?: string;
}

/** PUBLISHED = sent (final). DRAFT / PENDING_APPROVAL = waiting, in Draft approvals. */
export type CampaignStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED';

/** One row on the page: a sent campaign, or one waiting (then `id` and `draftId` are the draft's). */
export interface Campaign {
  id: string;
  /** Set while it's waiting: its row in Draft approvals. */
  draftId: string | null;
  title: string;
  message: string;
  channels: Channel[];
  filters: CampaignFilters;
  /** Matching parents when it was saved (sent: when it was sent, counted by the server). */
  recipientCount: number;
  status: CampaignStatus;
  createdById: string;
  authorName: string | null;
  sentAt: string | null;
  createdAt: string;
}

export type CampaignContent = Pick<Campaign, 'title' | 'message' | 'channels' | 'filters'>;

/** "Daily mandatory-activity reminders": Notification rows of type MANDATORY_REMINDER. */
export interface Reminder {
  id: string;
  childName: string;
  parentName: string;
  /** Development areas still below target with mandatory activities left (names as sent). */
  areas: string[];
  channels: Channel[];
  createdAt: string;
}

/** `POST /api/campaigns/audience`: the exact count, and the first 50 names (sorted). */
export interface AudiencePreview {
  count: number;
  parents: { id: string; name: string }[];
}

/** The same content, for telling whether a waiting campaign was edited (filter keys in order). */
export const sameCampaign = (a: CampaignContent) =>
  JSON.stringify([a.title.trim(), a.message.trim(), [...a.channels].sort(), Object.entries(a.filters).sort(([x], [y]) => x.localeCompare(y))]);
