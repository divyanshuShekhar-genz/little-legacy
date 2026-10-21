/**
 * App Content (guide §22, PRODUCT_SPEC §21), on the API (docs/API_REQUESTS.md #24,
 * src/api/appContent.ts). Types follow its responses and the Prisma models: `AppContentEntry` is the working draft (parents never see it) and
 * `AppContentVersion` is an immutable published snapshot; parent sessions keep the version they
 * started with. Editing text never creates a new app feature: keys and page routes only identify
 * where the text shows.
 */
export type AppContentSurface = 'TERMS' | 'PRIVACY' | 'HELP' | 'PAGE_FAQ';
export const SURFACES: AppContentSurface[] = ['TERMS', 'PRIVACY', 'HELP', 'PAGE_FAQ'];
export const SURFACE_LABELS: Record<AppContentSurface, string> = { TERMS: 'Terms', PRIVACY: 'Privacy', HELP: 'Help / enquiry', PAGE_FAQ: 'Page FAQs' };

export interface AppContentEntry {
  key: string;
  surface: AppContentSurface;
  /** Parent-app route, for PAGE_FAQ entries only. */
  page: string | null;
  title: string;
  body: string;
}

/** What a version stores per key (AppContentVersion.entries, Json). */
export type VersionEntries = Record<string, Omit<AppContentEntry, 'key'>>;

/** "Published history": one row per version, newest first (the full text is only in `latest`). */
export interface VersionSummary {
  version: number;
  publishedAt: string;
  entryCount: number;
  /** The admin who asked for the publish; null for the seeded version. */
  publishedByName: string | null;
}

/** The newest published version, in full (null before the first publish). */
export interface LatestVersion {
  version: number;
  entries: VersionEntries;
}

/** A "Publish new version" waiting for Super Admin (a draft of entity type AppContentVersion). */
export interface PendingPublish {
  draftId: string;
  status: 'DRAFT' | 'PENDING_APPROVAL';
  /** The working draft as it was submitted: approving publishes exactly this. */
  entries: VersionEntries;
  authorName: string;
  createdAt: string;
}

/** Two snapshots hold the same text (entry order doesn't matter). */
export const sameEntries = (a: VersionEntries, b: VersionEntries) => versionChanges(a, b).length === 0;

// Prototype messages (parent-content.js appEntryEditor()).
export const KEY_ERROR = 'Use a unique key with letters, numbers, dots, underscores or hyphens.';
export const PAGE_ERROR = 'Enter the parent page route for this FAQ.';
export const TEXT_ERROR = 'Enter a title and body.';

/** The prototype's checks for one entry. Returns the message, or null when it's fine. */
export function entryError(e: AppContentEntry, keys: string[], isNew: boolean): string | null {
  if (!/^[a-zA-Z][\w.-]*$/.test(e.key) || (isNew && keys.includes(e.key))) return KEY_ERROR;
  if (e.surface === 'PAGE_FAQ' && !/^[a-zA-Z][\w-]*$/.test(e.page ?? '')) return PAGE_ERROR;
  if (!e.title.trim() || !e.body.trim()) return TEXT_ERROR;
  return null;
}

export const toVersionEntries = (entries: AppContentEntry[]): VersionEntries =>
  Object.fromEntries(entries.map(({ key, ...rest }) => [key, rest]));

export interface EntryChange {
  key: string;
  kind: 'added' | 'changed' | 'removed';
  before: Omit<AppContentEntry, 'key'> | null;
  after: Omit<AppContentEntry, 'key'> | null;
}

/** Entry by entry: what a new version would change compared with the published one. */
export function versionChanges(published: VersionEntries, next: VersionEntries): EntryChange[] {
  // Field by field: stored versions come back with their keys in another order.
  const same = (a: VersionEntries[string], b: VersionEntries[string]) =>
    a.surface === b.surface && (a.page ?? null) === (b.page ?? null) && a.title === b.title && a.body === b.body;
  const keys = [...new Set([...Object.keys(published), ...Object.keys(next)])].sort();
  return keys.flatMap((key): EntryChange[] => {
    const before = published[key] ?? null;
    const after = next[key] ?? null;
    if (!before && after) return [{ key, kind: 'added', before, after }];
    if (before && !after) return [{ key, kind: 'removed', before, after }];
    if (before && after && !same(before, after)) return [{ key, kind: 'changed', before, after }];
    return [];
  });
}
