import type { AuditEntry } from '@/api/audit';
import type { DraftApproval } from '@/api/drafts';
import { formatChange, type FormatContext, type FormattedDraft } from '@/views/drafts/formatters';

type Obj = Record<string, unknown>;
const asObj = (v: unknown): Obj | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : null);
const str = (v: unknown) => (typeof v === 'string' ? v : '');

/**
 * Audit `before` / `after` come in two shapes. A direct save records snapshots of the saved row on
 * both sides; an approved draft records the draft's own before / after (a payload). The Draft
 * approvals formatters read a snapshot before and a payload after, so a few snapshot "afters" are
 * turned into the payload shape first.
 */
function normalise(type: string | null, before: Obj | null, after: Obj | null): Obj | null {
  if (!after) return after;
  switch (type) {
    case 'LibraryItem':
      return after.content ? after : { kind: after.kind ?? before?.kind, requested: 'publish', content: after };
    case 'Product':
      // An approved draft records { requested, content }; a direct save, the product itself.
      return after.content ? after : { requested: 'publish', content: after };
    case 'AssessmentConfig': {
      const rules = asObj(after.rules);
      if (!rules) return after;
      const picks = (asObj(rules.mandatory) ?? {}) as Record<string, Record<string, string[]>>;
      const counts = (asObj(rules.requiredCounts) ?? {}) as Record<string, Record<string, number>>;
      const mandatory = [...new Set([...Object.keys(picks), ...Object.keys(counts)])].flatMap((age) =>
        [...new Set([...Object.keys(picks[age] ?? {}), ...Object.keys(counts[age] ?? {})])].map((areaId) => ({
          age: Number(age),
          areaId,
          activityIds: picks[age]?.[areaId] ?? [],
          requiredCount: counts[age]?.[areaId] ?? 0,
        })),
      );
      return { areas: rules.areas, mandatory };
    }
    case 'QuestionSkillMap':
      return Array.isArray(after.options)
        ? { skillId: after.skillId, stages: Object.fromEntries(after.options.map((o) => [asObj(o)?.id, asObj(o)?.skillStage ?? null])) }
        : after;
    case 'CommunityPostReview':
    case 'CommunityTeamPost':
      // The snapshot has a status; the formatter reads the decision.
      return after.action || !after.status
        ? after
        : { ...after, action: after.status === 'PUBLISHED' ? 'approve' : after.status === 'REJECTED' ? 'reject' : undefined, reason: after.rejectionReason };
    case 'ActivityFamily':
      return after.archived === true && before?.archived === false ? { archive: true } : after;
    case 'ActivityFamilyLink': {
      if (!Array.isArray(after.difficulties)) return after;
      const had = new Set((Array.isArray(before?.difficulties) ? before.difficulties : []).map((x) => asObj(x)?.id));
      const added = after.difficulties.map((x) => asObj(x)).find((x) => x && !had.has(x.id));
      return { activityId: added?.id ?? null };
    }
    default:
      return after;
  }
}

/**
 * An audit entry's change, readably (Field · Before · After), using the Draft approvals
 * formatters; anything without a formatter gets the readable fallback (no ids or raw JSON).
 * Null when the entry has no before / after (e.g. "Signed in").
 */
export function formatAuditEntry(e: AuditEntry, ctx: FormatContext = {}): FormattedDraft | null {
  const before = asObj(e.before);
  const rawAfter = asObj(e.after);
  if (!before && !rawAfter) return null;
  const after = normalise(e.entityType, before, rawAfter);
  const action: FormattedDraft['action'] = !before ? 'create' : !rawAfter || rawAfter.delete === true ? 'remove' : 'update';
  const draft: DraftApproval = {
    id: e.id,
    authorName: e.actorName,
    section: e.section ?? '',
    entityType: e.entityType ?? '',
    entityId: e.entityId,
    status: 'PUBLISHED',
    before: e.before,
    after,
    reason: null,
    createdAt: e.createdAt,
    // The action text names the change when a formatter can't (no `names` in the audit log).
    label: e.action,
    // The audit log has no `names`: regional categories are named from the real list.
    names: Object.fromEntries((ctx.regions ?? []).map((r) => [r.id, r.name])),
    regionId: str(asObj(e.after)?.regionId ?? asObj(e.before)?.regionId) || null,
  };
  return formatChange(draft, before, after, action, ctx);
}
