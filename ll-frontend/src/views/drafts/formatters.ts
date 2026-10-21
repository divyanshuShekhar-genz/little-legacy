/**
 * Readable drafts: one formatter per draft entityType (the types registered with DraftsService in
 * ll-backend), plus a fallback for anything else. Each formatter says what the change is (the
 * list's "Change" column) and which fields change, as display values (no ids, no raw JSON).
 *
 * A draft's `before` is the published snapshot and `after` is the submitted payload; their field
 * names mostly match, but not always, so each field reads its own side. Fields whose display
 * value is the same on both sides are left out.
 *
 * Names for ids (parents, areas, countries…) come from `draft.names` (docs/API_REQUESTS.md #19).
 * Hard-deleted items have no name, so formatters keep a fallback wording. Prices are keyed by
 * country code (not in `names`), so the screens pass the country list for names and currencies.
 */
import type { DraftApproval } from '@/api/drafts';
import { DEFAULT_LEVEL_COLOUR } from '@/api/levels';
import { uploadKindFromUrl } from '@/api/uploads';
import { humanize } from '@/components/ui/Badge';
import { PLAN_LABELS, type PlanTier } from '@/constants/plans';
import { ROLE_LABELS, type AdminRole } from '@/constants/permissions';
import { PERMISSION_LABELS } from '@/constants/navigation';
import { SURFACE_LABELS, versionChanges, type AppContentSurface, type VersionEntries } from '@/views/appContent/data';
import { DEFAULT_VISIBLE_LIMIT, WEEK_LABELS, type ChecklistWeek } from '@/views/checklist/data';
import { PRODUCT_STATUS_LABELS, type ProductStatus } from '@/views/commerce/data';
import { GENDER_LABELS, type ChildGender } from '@/views/notifications/data';
import type { Country } from '@/api/countries';
import { formatMoney } from '@/utils/format';

export type DraftValue =
  | { kind: 'text'; text: string }
  | { kind: 'list'; items: DraftValue[] }
  | { kind: 'image'; url: string; caption?: string | null }
  | { kind: 'file'; url: string }
  | { kind: 'colour'; hex: string };

export interface DraftField {
  label: string;
  before: DraftValue | null;
  after: DraftValue | null;
}

export interface FormattedDraft {
  /** "Reply to Priya Sharma", "Team post: …", "Country: Japan". */
  change: string;
  /** create: nothing published yet · update: changes a published item · remove: deletes or withdraws it. */
  action: 'create' | 'update' | 'remove';
  /** Context lines shown above the changes (e.g. the enquiry being answered). */
  context: string[];
  fields: DraftField[];
}

type Obj = Record<string, unknown>;

// ---- Value helpers ------------------------------------------------------------------------------

const text = (t: string): DraftValue => ({ kind: 'text', text: t });
const asObj = (v: unknown): Obj | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : null);
const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const yesNo = (v: unknown): DraftValue | null => (typeof v === 'boolean' ? text(v ? 'Yes' : 'No') : null);
const plain = (v: unknown): DraftValue | null => (v == null || v === '' ? null : text(str(v)));
const enumText = (v: unknown): DraftValue | null => (typeof v === 'string' && v ? text(humanize(v)) : null);
const plan = (v: unknown): DraftValue | null => (typeof v === 'string' && v in PLAN_LABELS ? text(PLAN_LABELS[v as PlanTier]) : plain(v));
const short = (t: string, n = 60) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t);
const isUrl = (v: unknown): v is string => typeof v === 'string' && (/^\/uploads\//.test(v) || /^https?:\/\//.test(v));

/** A file URL as a thumbnail (images) or a file reference (audio, video, documents). */
function file(v: unknown, caption?: string | null): DraftValue | null {
  if (!isUrl(v)) return null;
  return uploadKindFromUrl(v) === 'IMAGE' || /\.(png|jpe?g|webp)$/i.test(v) ? { kind: 'image', url: v, caption } : { kind: 'file', url: v };
}

/** "3 days 4 hours" / "No expiry" (community posts store hours; null = no expiry). */
function expiry(v: unknown): DraftValue | null {
  if (v === null) return text('No expiry');
  if (typeof v !== 'number') return null;
  const days = Math.floor(v / 24), hours = v % 24;
  const parts = [days && `${days} day${days === 1 ? '' : 's'}`, hours && `${hours} hour${hours === 1 ? '' : 's'}`].filter(Boolean);
  return text(parts.length ? parts.join(' ') : 'No expiry');
}

/** A name for an id, from `names` (#19). Missing = the item was deleted (or the audit log, which has no names). */
const namer = (d: DraftApproval) => (id: unknown, fallback = 'Not available') =>
  typeof id === 'string' && id ? (d.names?.[id] ?? fallback) : null;

const same = (a: DraftValue | null, b: DraftValue | null) => JSON.stringify(a) === JSON.stringify(b);

// ---- Field specs --------------------------------------------------------------------------------

interface Spec {
  label: string;
  /** Display value from one side (`before` snapshot or `after` payload). */
  show: (side: Obj, which: 'before' | 'after') => DraftValue | null;
}
const field = (label: string, key: string, as: (v: unknown) => DraftValue | null = plain): Spec => ({ label, show: (o) => as(o[key]) });

/** Builds the field list: everything for a new item, changed fields for an edit, current values for a removal. */
function fields(specs: Spec[], before: Obj | null, after: Obj | null, action: FormattedDraft['action']): DraftField[] {
  return specs.flatMap((s) => {
    const b = before ? s.show(before, 'before') : null;
    const a = after && action !== 'remove' ? s.show(after, 'after') : null;
    if (action === 'create') return a ? [{ label: s.label, before: null, after: a }] : [];
    if (action === 'remove') return b ? [{ label: s.label, before: b, after: null }] : [];
    return same(b, a) ? [] : [{ label: s.label, before: b, after: a }];
  });
}

const actionOf = (d: DraftApproval, after: Obj | null): FormattedDraft['action'] =>
  after?.delete === true ? 'remove' : d.before == null ? 'create' : 'update';

/** "Remove " for removals, so every change line reads naturally. */
const verb = (action: FormattedDraft['action']) => (action === 'remove' ? 'Remove ' : '');

// ---- Formatters, one per entityType ---------------------------------------------------------------

/** What formatters need besides the draft: countries, for price names and currencies. */
export interface FormatContext {
  countries?: Pick<Country, 'code' | 'name' | 'currency'>[];
  /**
   * Regional categories, for naming them where a change has no `names` (Audit History): a
   * per-category checklist item or limit, for example.
   */
  regions?: { id: string; name: string }[];
}

type Formatter = (
  d: DraftApproval,
  before: Obj | null,
  after: Obj | null,
  action: FormattedDraft['action'],
  ctx: FormatContext,
) => Omit<FormattedDraft, 'action'> & { weak?: boolean; action?: FormattedDraft['action'] };

const CHANNELS: Record<string, string> = { EMAIL: 'Email', IN_APP: 'In-app notification' };
const RESTRICTIONS: Record<string, string> = {
  ACTIVITIES_SECTION: 'Activities section',
  ACTIVITY: 'Activity',
  LEVEL: 'Level',
  STORIES: 'Stories',
  RHYMES: 'Rhymes',
  COMMUNITY: 'Community',
  ECOMMERCE: 'Ecommerce',
};
const SETTINGS: Record<string, string> = {
  'community.regularVisibleLimit': 'Community: regular messages visible at once',
  'checklist.visibleLimit': 'Parent checklist: maximum items visible at once',
};
/** The value a setting has before anything is stored (the server's default), shown as the old value. */
const SETTING_DEFAULTS: Record<string, unknown> = { 'checklist.visibleLimit': DEFAULT_VISIBLE_LIMIT };

/** A community post's state: the snapshot has a status, the payload a decision. */
const decision = (o: Obj, which: 'before' | 'after') =>
  which === 'before' ? enumText(o.status) : o.action === 'reject' ? text('Rejected') : o.action === 'approve' ? text('Published') : null;
const postSpecs = (withTitle: boolean): Spec[] => [
  ...(withTitle ? [field('Title', 'title')] : []),
  { label: 'Status', show: decision },
  field('Message', 'message'),
  { label: 'Reason for rejection', show: (o, w) => plain(w === 'before' ? o.rejectionReason : o.action === 'reject' ? o.reason : null) },
  field('Expire after', 'expiryHours', expiry),
  { label: 'Pinned', show: (o, w) => (w === 'after' && o.action === 'reject' ? text('No') : yesNo(o.pinned)) },
];

/** Assessment rules: the snapshot's stored rules and the payload, as rows per area and per age. */
function rulesRows(o: Obj, which: 'before' | 'after') {
  const rules = which === 'before' ? asObj(o.rules) : o;
  const areas = (Array.isArray(rules?.areas) ? rules.areas : []).map((a) => asObj(a) ?? {});
  const mandatory: { age: string; areaId: string; activityIds: string[]; count: number }[] = [];
  if (which === 'after') {
    for (const m of Array.isArray(o.mandatory) ? o.mandatory : []) {
      const r = asObj(m) ?? {};
      mandatory.push({ age: str(r.age), areaId: str(r.areaId), activityIds: (r.activityIds as string[]) ?? [], count: Number(r.requiredCount ?? 0) });
    }
  } else if (rules) {
    const picks = (asObj(rules.mandatory) ?? {}) as Record<string, Record<string, string[]>>;
    const counts = (asObj(rules.requiredCounts) ?? {}) as Record<string, Record<string, number>>;
    for (const age of new Set([...Object.keys(picks), ...Object.keys(counts)])) {
      for (const areaId of new Set([...Object.keys(picks[age] ?? {}), ...Object.keys(counts[age] ?? {})])) {
        mandatory.push({ age, areaId, activityIds: picks[age]?.[areaId] ?? [], count: counts[age]?.[areaId] ?? 0 });
      }
    }
  }
  return { areas, mandatory };
}

/**
 * One row per country whose price is on either side: "Price · India" INR 199.00 → INR 249.00, or
 * "Not purchasable" when a side has no price there. `prices` reads a side's price map.
 */
function priceSpecs(ctx: FormatContext, sides: (Obj | null)[], prices: (o: Obj, w: 'before' | 'after') => Obj | null): Spec[] {
  const codes = new Set<string>();
  sides.forEach((o, i) => Object.keys((o && prices(o, i === 0 ? 'before' : 'after')) ?? {}).forEach((c) => codes.add(c)));
  const country = (code: string) => ctx.countries?.find((c) => c.code === code);
  return [...codes]
    .sort((a, b) => (country(a)?.name ?? a).localeCompare(country(b)?.name ?? b))
    .map((code) => ({
      label: `Price · ${country(code)?.name ?? code}`,
      show: (o, w) => {
        const map = prices(o, w);
        if (!map) return null;
        const v = map[code];
        if (v == null || v === '') return text('Not purchasable');
        const c = country(code);
        return text(c ? formatMoney(Number(v), c.currency) : Number(v).toFixed(2));
      },
    }));
}

const SAVED_IN_DRAFT = 'Saved in draft by the author: not submitted for approval yet.';

const FORMATTERS: Record<string, Formatter> = {
  /** A staff account (Team & Permissions). Audit only: staff changes never go through drafts. */
  AdminUser: (_d, b, a, action) => {
    const sections = (o: Obj) =>
      o.role === 'SUPER_ADMIN'
        ? text('All sections')
        : Array.isArray(o.permissions)
          ? text(o.permissions.map((p) => PERMISSION_LABELS[p as keyof typeof PERMISSION_LABELS] ?? str(p)).join(', ') || 'None')
          : null;
    return {
      change: `Staff account: ${str(a?.name ?? b?.name)}`,
      context: [],
      fields: fields(
        [
          field('Full name', 'name'),
          field('Email', 'email'),
          { label: 'Role', show: (o) => plain(ROLE_LABELS[o.role as AdminRole] ?? o.role) },
          { label: 'Sections', show: sections },
          { label: 'Direct publishing', show: (o) => yesNo(o.directPublish) },
          { label: 'Status', show: (o) => (typeof o.active === 'boolean' ? text(o.active ? 'Active' : 'Inactive') : null) },
        ],
        b,
        a,
        action,
      ),
    };
  },

  EnquiryReply: (d, _b, a, action) => {
    const parent = namer(d)(a?.enquiryId, '');
    return {
      change: parent ? `Reply to ${parent}` : 'Reply to a parent enquiry',
      weak: !parent,
      context: d.context ? [`Enquiry: ${d.context}`] : [],
      fields: fields(
        [field('Reply', 'body'), { label: 'Send through', show: (o) => (Array.isArray(o.channels) ? text(o.channels.map((c) => CHANNELS[c] ?? c).join(' + ')) : null) }],
        null,
        a,
        action,
      ),
    };
  },

  CommunityPostReview: (d, b, a, action) => {
    const parent = namer(d)(d.entityId, '');
    const what = a?.action === 'reject' ? 'Reject' : 'Approve';
    return {
      change: parent ? `${what} message from ${parent}` : `Community message: ${what.toLowerCase()}`,
      weak: !parent,
      context: d.context ? [`Parent's message: ${d.context}`] : [],
      fields: fields(postSpecs(false), b, a, action),
    };
  },

  CommunityTeamPost: (_d, b, a, action) => ({
    change: `Team post: ${short(str(a?.title ?? b?.title))}`,
    context: [],
    fields: fields(postSpecs(true), b, a, action),
  }),

  Setting: (d, b, a, action) => {
    const key = d.entityId ?? str(b?.key);
    // A per-category setting's key ends in ":{regionId}" (e.g. each category's checklist limit, #25).
    const [base = key, regionId] = key.split(':');
    const region = regionId ? namer(d)(d.regionId ?? regionId, 'a regional category') : null;
    // Nothing stored yet: the default applied, so the change reads "5 → 4" rather than a new value.
    const fallback = SETTING_DEFAULTS[base];
    const defaulted = action !== 'remove' && fallback !== undefined && (b?.value ?? null) === null;
    const own = defaulted ? 'update' : action;
    return {
      change: SETTINGS[base] ?? humanizeKey(base),
      action: own,
      context: [...(region ? [`Regional learning category: ${region}`] : []), ...(a?.requested === 'draft' ? [SAVED_IN_DRAFT] : [])],
      fields: fields([field('Value', 'value', auto)], defaulted ? { ...b, value: fallback } : b, a, own),
    };
  },

  Country: (_d, b, a, action) => {
    const charge = (o: Obj) => (typeof o.deliveryCharge === 'number' ? text(`${o.deliveryCharge} ${str(o.currency ?? b?.currency)}`.trim()) : null);
    return {
      change: `${verb(action)}Country: ${str(a?.name ?? b?.name)}`,
      context: [],
      fields: fields(
        [
          field('Name', 'name'),
          field('Code', 'code'),
          field('Currency', 'currency'),
          { label: 'Delivery charge', show: charge },
          field('Delivery estimate', 'deliveryEstimate'),
          { label: 'Availability', show: (o) => (typeof o.enabled === 'boolean' ? text(o.enabled ? 'Enabled' : 'Disabled') : null) },
        ],
        b,
        a,
        action,
      ),
    };
  },

  CountryRestriction: (d, b, a, action) => {
    const name = namer(d);
    const src = action === 'remove' ? b : a;
    const code = str(src?.countryCode);
    return {
      change: `${verb(action)}${RESTRICTIONS[str(src?.type)] ?? 'Country'} restriction · ${name(code, code) ?? code}`,
      context: [],
      fields: fields(
        [
          { label: 'Country', show: (o) => plain(name(o.countryCode, str(o.countryCode))) },
          { label: 'Restrict', show: (o) => plain(RESTRICTIONS[str(o.type)] ?? o.type) },
          { label: 'Target', show: (o) => text(o.targetId ? (name(o.targetId) as string) : 'Entire section') },
          field('Parent message', 'message'),
          { label: 'State', show: (o) => (typeof o.enabled === 'boolean' ? text(o.enabled ? 'Enabled' : 'Disabled') : null) },
        ],
        b,
        a,
        action,
      ),
    };
  },

  LearningRegion: (d, b, a, action) => {
    const name = namer(d);
    return {
      change: `${verb(action)}Regional category: ${str(action === 'remove' ? b?.name : (a?.name ?? b?.name))}`,
      context: [],
      fields: fields(
        [
          field('Name', 'name'),
          { label: 'Countries', show: (o) => (Array.isArray(o.countryCodes) ? text(o.countryCodes.map((c) => name(c, str(c))).join(', ') || 'None') : null) },
          field('Default category', 'isDefault', yesNo),
          field('Active', 'active', yesNo),
        ],
        b,
        a,
        action,
      ),
    };
  },

  DevelopmentArea: (d, b, a, action) => ({
    change: `${verb(action)}Development area: ${str(action === 'remove' ? b?.name : (a?.name ?? b?.name))}`,
    context: regionContext(d),
    fields: fields([field('Name', 'name'), field('Description', 'description')], b, a, action),
  }),

  AgeGroup: (d, b, a, action) => ({
    change: `Age group: ${str(a?.age ?? b?.age)} years`,
    context: regionContext(d),
    fields: fields([{ label: 'Age', show: (o) => (typeof o.age === 'number' ? text(`${o.age} years`) : null) }], b, a, action),
  }),

  ActivityCategory: (d, b, a, action) => {
    const area = namer(d)(a?.areaId ?? b?.areaId, '');
    return {
      change: `${verb(action)}Category: ${area ? `${area} · ` : ''}${str(action === 'remove' ? b?.name : (a?.name ?? b?.name))}`,
      context: regionContext(d),
      fields: fields([field('Name', 'name'), field('Description', 'description')], b, a, action),
    };
  },

  Level: (d, b, a, action) => {
    const name = namer(d);
    const area = name(a?.areaId ?? b?.areaId, '');
    return {
      change: `${verb(action)}Level ${str(action === 'remove' ? b?.number : (a?.number ?? b?.number))}${area ? `: ${area}` : ''}`,
      context: regionContext(d),
      fields: fields(
        [
          field('Level', 'number'),
          field('Title', 'title'),
          field('Icon', 'icon'),
          // No stored colour shows as the default (as the API returns it), so null → default isn't a change.
          { label: 'Icon colour', show: (o) => ({ kind: 'colour', hex: (typeof o.iconColor === 'string' ? o.iconColor : DEFAULT_LEVEL_COLOUR).toUpperCase() }) },
          field('Required score', 'requiredScore'),
          field('Activities with repetitions complete', 'requiredMastered'),
          { label: 'Category', show: (o) => text(o.categoryId ? (name(o.categoryId) as string) : 'None') },
        ],
        b,
        a,
        action,
      ),
    };
  },

  Activity: (d, b, a, action) => {
    const name = namer(d);
    const ref = (key: string): Spec['show'] => (o) => plain(name(o[key]));
    return {
      change: `${verb(action)}Activity: ${short(str(action === 'remove' ? b?.title : (a?.title ?? b?.title)))}`,
      context: regionContext(d),
      fields: fields(
        [
          field('Title', 'title'),
          field('Description', 'description'),
          { label: 'Development area', show: ref('areaId') },
          { label: 'Category', show: (o) => (o.categoryId ? plain(name(o.categoryId)) : text('None')) },
          { label: 'Level', show: ref('levelId') },
          { label: 'Age', show: (o) => (typeof o.age === 'number' ? text(`${o.age} years`) : null) },
          field('Materials', 'materials'),
          { label: 'Duration', show: (o) => (typeof o.durationMinutes === 'number' ? text(`${o.durationMinutes} min`) : null) },
          field('Minimum plan', 'minimumPlan', plan),
          field('Base marks', 'baseMarks'),
          field('Repetitions needed', 'masteryTarget'),
          { label: 'Skill', show: (o) => (o.skillId ? plain(name(o.skillId)) : text('None')) },
          field('Stage within level', 'skillStage', enumText),
          { label: 'Activity group', show: (o) => (o.groupId ? plain(name(o.groupId)) : text('None')) },
          { label: 'Difficulty in the group', show: (o) => (o.groupId && typeof o.difficulty === 'number' ? text(`Difficulty ${o.difficulty}`) : null) },
          field('Status', 'status', enumText),
          {
            label: 'Guidance steps',
            show: (o) =>
              Array.isArray(o.steps)
                ? { kind: 'list', items: o.steps.map((s, i) => text(`${i + 1}. ${str(asObj(s)?.title)}${asObj(s)?.description ? ` — ${str(asObj(s)?.description)}` : ''}`)) }
                : null,
          },
          {
            label: 'Preview cards',
            show: (o) =>
              Array.isArray(o.previews)
                ? { kind: 'list', items: o.previews.map((p) => file(asObj(p)?.imageUrl, str(asObj(p)?.caption) || null) ?? text(str(asObj(p)?.caption) || 'No image')) }
                : null,
          },
        ],
        b,
        a,
        action,
      ),
    };
  },

  Question: (d, b, a, action) => ({
    change: `${verb(action)}Question: ${short(str(action === 'remove' ? b?.text : (a?.text ?? b?.text)))}`,
    context: [namer(d)(a?.areaId ?? b?.areaId, '')].filter(Boolean).map((n) => `Development area: ${n}`).concat(regionContext(d)),
    fields: fields(
      [
        field('Question', 'text'),
        field('Difficulty', 'difficulty', enumText),
        { label: 'Age', show: (o) => text(typeof o.age === 'number' ? `${o.age} years` : 'All supported ages') },
        {
          label: 'Options',
          show: (o) => (Array.isArray(o.options) ? { kind: 'list', items: o.options.map((x) => text(`${str(asObj(x)?.label)} · ${str(asObj(x)?.marks)} marks`)) } : null),
        },
      ],
      b,
      a,
      action,
    ),
  }),

  Skill: (d, b, a, action) => {
    const name = namer(d);
    const expected = (o: Obj) =>
      Array.isArray(o.expected)
        ? text(o.expected.map((e) => `Age ${str(asObj(e)?.age)}: ${str(asObj(e)?.expectedScore)}%`).join(' · ') || 'Not set')
        : null;
    return {
      change: `Skill: ${str(a?.name ?? b?.name)}`,
      context: regionContext(d),
      fields: fields(
        [field('Name', 'name'), { label: 'Development area', show: (o) => plain(name(o.areaId)) }, { label: 'Expected score by age', show: expected }],
        b,
        a,
        action,
      ),
    };
  },

  /** Map answers: the snapshot lists options with their stage; the payload keys stages by option id. */
  QuestionSkillMap: (d, b, a, action) => {
    const name = namer(d);
    const stagesOf = (o: Obj, which: 'before' | 'after'): Record<string, unknown> =>
      which === 'before'
        ? Object.fromEntries((Array.isArray(o.options) ? o.options : []).map((x) => [str(asObj(x)?.id), asObj(x)?.skillStage ?? null]))
        : ((asObj(o.stages) ?? {}) as Record<string, unknown>);
    const optionIds = [...new Set([...Object.keys(b ? stagesOf(b, 'before') : {}), ...Object.keys(a ? stagesOf(a, 'after') : {})])];
    const question = name(d.entityId, '');
    return {
      change: question ? `Mapped answers: ${short(question)}` : 'Mapped answers',
      weak: !question,
      context: regionContext(d),
      fields: fields(
        [
          { label: 'Skill', show: (o) => text(o.skillId ? (name(o.skillId) as string) : 'Not mapped') },
          ...optionIds.map(
            (id): Spec => ({
              label: `Answer: ${name(id, 'Answer option')}`,
              // "Not mapped" clears every stage, whatever the payload says.
              show: (o, w) => text(w === 'after' && !o.skillId ? 'Unknown' : (enumText(stagesOf(o, w)[id]) as { text: string } | null)?.text ?? 'Unknown'),
            }),
          ),
        ],
        b,
        a,
        action,
      ),
    };
  },

  /** Activity Progression settings: Bases, weekly settings and allocation overrides (one save). */
  ProgressionSettings: (d, b, a, action) => {
    const name = namer(d);
    const region = name(d.entityId ?? d.regionId, '');
    const base = (i: number): Spec => ({
      label: `Base ${i + 1}`,
      show: (o) => {
        const x = Array.isArray(o.bases) ? asObj(o.bases[i]) : null;
        return x ? text(`From ${str(x.from)}% · starting difficulty ${str(x.start)}`) : null;
      },
    });
    const override = (r: unknown) => {
      const x = asObj(r) ?? {};
      const area = x.area === 'All' ? 'All areas' : (name(x.area, 'Development area') as string);
      const planName = x.plan === 'All' ? 'All plans' : (plan(x.plan) as { text: string } | null)?.text ?? str(x.plan);
      return text(`Age ${str(x.age)} · ${x.base === 'All' ? 'All Bases' : str(x.base)} · ${area} · ${planName}: limit ${str(x.limit)}, start ${str(x.start)}`);
    };
    const day = (v: unknown) => {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return v === 'anniversary' ? text('Every 7 days from cycle start') : typeof v === 'string' && days[Number(v)] ? text(`${days[Number(v)]} · 00:00 UTC`) : null;
    };
    return {
      change: `Progression settings${region ? `: ${region}` : ''}`,
      context: [],
      fields: fields(
        [
          base(0),
          base(1),
          base(2),
          field('New activities per week', 'weekly'),
          { label: 'Maximum visible activities', show: (o) => ('maxVisible' in o ? text(o.maxVisible == null ? 'Not used' : str(o.maxVisible)) : null) },
          { label: 'Pending activities', show: (o) => (typeof o.pendingEnabled === 'boolean' ? text(o.pendingEnabled ? 'On' : 'Off') : null) },
          field('Maximum pending displayed', 'pendingLimit'),
          { label: 'Pending expiry in days', show: (o) => (o.pendingDays === 0 ? text('No expiry') : plain(o.pendingDays)) },
          field('Pending counts within weekly limit', 'pendingCounts', yesNo),
          field('Recent completions shown', 'recent'),
          field('Continue Learning cards', 'continueCount'),
          field('After an unable outcome', 'reinforcement'),
          field('Weekly boundary', 'resetDay', day),
          { label: 'Allocation overrides', show: (o) => (Array.isArray(o.overrides) ? (o.overrides.length ? { kind: 'list', items: o.overrides.map(override) } : text('None')) : null) },
        ],
        b,
        a,
        action === 'remove' ? 'update' : action,
      ),
    };
  },

  /** An activity group; `{ archive: true }` archives it. The snapshot and payload store Bases as positions. */
  ActivityFamily: (d, b, a, action) => {
    const name = namer(d);
    if (a?.archive === true) {
      return {
        change: `Archive activity group: ${str(b?.name) || 'activity group'}`,
        context: regionContext(d),
        fields: [{ label: 'Status', before: text('Active'), after: text('Archived') }],
      };
    }
    const bases = (o: Obj) => (Array.isArray(o.baseEligibility) ? text([...o.baseEligibility].sort().map((p) => `Base ${str(p)}`).join(', ')) : null);
    return {
      change: `Activity group: ${str(a?.name ?? b?.name)}`,
      context: regionContext(d),
      fields: fields(
        [
          field('Activity name', 'name'),
          { label: 'Development area', show: (o) => plain(name(o.areaId)) },
          { label: 'Category', show: (o) => text(o.categoryId ? (name(o.categoryId) as string) : 'None') },
          { label: 'Age', show: (o) => (typeof o.age === 'number' ? text(`${o.age} years`) : null) },
          { label: 'Primary skill', show: (o) => text(o.skillId ? (name(o.skillId) as string) : 'Not tagged') },
          { label: 'Expected skill score', show: (o) => (typeof o.benchmark === 'number' ? text(`${o.benchmark}%`) : null) },
          field('Mandatory during initial assessment', 'mandatory', yesNo),
          { label: 'Starting Base eligibility', show: bases },
        ],
        b,
        a,
        action,
      ),
    };
  },

  /** "Link existing content": an ungrouped activity joins the group (entityId). */
  ActivityFamilyLink: (d, _b, a) => {
    const name = namer(d);
    const activity = name(a?.activityId, '');
    const group = name(d.entityId, '');
    return {
      change: activity && group ? `Link ${short(activity)} to ${group}` : 'Link content to an activity group',
      weak: !activity || !group,
      context: regionContext(d),
      fields: [{ label: 'Content', before: null, after: text(activity || 'Activity') }],
    };
  },

  /** A notification campaign (API_REQUESTS #23): content, channels and the AND-combined audience. */
  Campaign: (d, b, a, action) => {
    const name = namer(d);
    const audience = (o: Obj) => {
      const f = asObj(o.filters);
      if (!f) return null;
      const parts = [
        Array.isArray(f.regionIds) && f.regionIds.length ? `Regional learning category: ${f.regionIds.map((id) => name(id, 'Category')).join(', ')}` : null,
        Array.isArray(f.countryCodes) && f.countryCodes.length ? `Country: ${f.countryCodes.map((c) => name(c, str(c))).join(', ')}` : null,
        f.areaId ? `Development area: ${name(f.areaId, 'Development area')}` : null,
        typeof f.age === 'number' ? `Child age: ${f.age}` : null,
        typeof f.gender === 'string' ? `Gender: ${GENDER_LABELS[f.gender as ChildGender] ?? humanize(f.gender)}` : null,
        typeof f.level === 'number' ? `Level: ${f.level}` : null,
        f.plan ? `Subscription: ${(plan(f.plan) as { text: string } | null)?.text ?? str(f.plan)}` : null,
        f.storyCategoryId ? `Story category read: ${name(f.storyCategoryId, 'Story category')}` : null,
        f.rhymeCategoryId ? `Rhyme category played: ${name(f.rhymeCategoryId, 'Rhyme category')}` : null,
      ].filter((x): x is string => Boolean(x));
      return parts.length ? { kind: 'list' as const, items: parts.map(text) } : text('All parents');
    };
    return {
      change: `Notification: ${short(str(a?.title ?? b?.title))}`,
      // The payload's `requested`: 'draft' = the author only saved it (#23).
      context: a?.requested === 'draft' ? [SAVED_IN_DRAFT] : [],
      fields: fields(
        [
          field('Notification title', 'title'),
          field('Message', 'message'),
          { label: 'Send through', show: (o) => (Array.isArray(o.channels) ? text(o.channels.map((c) => CHANNELS[c] ?? c).join(' + ')) : null) },
          { label: 'Audience', show: audience },
          { label: 'Matching parents when saved', show: (o) => (typeof o.recipientCount === 'number' ? text(String(o.recipientCount)) : null) },
        ],
        b,
        a,
        action,
      ),
    };
  },

  /**
   * "Publish new version" of App Content (API_REQUESTS #24). The snapshot is the published version
   * (`{ version, entries }`), the payload the draft's `entries`; the change is listed entry by entry.
   */
  AppContentVersion: (_d, b, a) => {
    const published = (asObj(b?.entries) ?? {}) as VersionEntries;
    const next = (asObj(a?.entries) ?? {}) as VersionEntries;
    const version = typeof b?.version === 'number' ? b.version + 1 : null;
    const entry = (e: VersionEntries[string] | null): DraftValue | null =>
      e ? { kind: 'list', items: [text(`${SURFACE_LABELS[e.surface as AppContentSurface] ?? e.surface}${e.page ? ` · ${e.page}` : ''}`), text(e.title), text(e.body)] } : null;
    const kinds = { added: 'Added', changed: 'Changed', removed: 'Removed' } as const;
    return {
      change: `App Content${version ? `: version ${version}` : ': new version'}`,
      // The payload's `requested`: 'draft' = the author only saved it (#24).
      context: a?.requested === 'draft' ? [SAVED_IN_DRAFT] : [],
      fields: versionChanges(published, next).map((c) => ({ label: `${kinds[c.kind]} · ${c.key}`, before: entry(c.before), after: entry(c.after) })),
    };
  },

  /**
   * A working-draft App Content entry (#24). Audit only: entry edits never go through drafts. Both
   * sides are `{ key, surface, page, title, body }`; an add has no before, a delete no after.
   */
  AppContentEntry: (d, b, a, action) => ({
    change: `${verb(action)}App Content entry: ${str(a?.key ?? b?.key ?? d.entityId)}`,
    context: [],
    fields: fields(
      [
        { label: 'Surface', show: (o) => (typeof o.surface === 'string' ? text(SURFACE_LABELS[o.surface as AppContentSurface] ?? humanize(o.surface)) : null) },
        field('Page', 'page'),
        field('Title / question', 'title'),
        field('Body / answer', 'body'),
      ],
      b,
      a,
      action,
    ),
  }),

  /** A parent checklist item (#25). Each regional category has its own checklist (Q27). */
  ChecklistItem: (d, b, a, action) => ({
    change: `${verb(action)}Checklist item: ${short(str(action === 'remove' ? b?.title : (a?.title ?? b?.title)))}`,
    context: [...regionContext({ ...d, regionId: d.regionId ?? str(a?.regionId ?? b?.regionId) }), ...(a?.requested === 'draft' ? [SAVED_IN_DRAFT] : [])],
    fields: fields(
      [
        { label: 'Week', show: (o) => (typeof o.week === 'number' ? text(WEEK_LABELS[o.week as ChecklistWeek] ?? `Week ${o.week}`) : null) },
        field('Title', 'title'),
        field('Instructions', 'description'),
        field('Display order', 'position'),
        field('Status', 'status', enumText),
      ],
      b,
      a,
      action,
    ),
  }),

  /**
   * A story or rhyme (API_REQUESTS #17 / #18). The snapshot is the live item; the payload is
   * `{ kind, requested, content }`. `requested: 'draft'` = the author only saved it (not submitted).
   */
  LibraryItem: (d, b, a, action) => {
    const name = namer(d);
    const content = asObj(a?.content);
    const kind = str(a?.kind ?? b?.kind);
    const noun = kind === 'RHYME' ? 'Rhyme' : 'Story';
    const side = (o: Obj, w: 'before' | 'after') => (w === 'after' ? (asObj(o.content) ?? {}) : o);
    const chaptersOf = (o: Obj | null) => (Array.isArray(o?.chapters) ? o.chapters.map((c) => asObj(c) ?? {}) : []);
    const pagesOf = (c: Obj) => (Array.isArray(c.pages) ? c.pages.map((p) => asObj(p) ?? {}) : []);
    const imageCount = (c: Obj) => pagesOf(c).reduce((n, p) => n + (Array.isArray(p.images) ? p.images.length : 0), 0);
    const count = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;
    const summary = (c: Obj, i: number) =>
      text(`${i + 1}. ${str(c.title) || 'Untitled chapter'} · ${count(pagesOf(c).length, 'page')} · ${count(imageCount(c), 'image')}${c.musicUrl ? ' · music' : ''}`);

    // What changed, chapter by chapter (matched by id; new rows have no id or a "new-" one).
    const before = chaptersOf(b);
    const after = chaptersOf(content);
    const changes: string[] = [];
    if (b) {
      for (const c of after) {
        const old = before.find((x) => x.id && x.id === c.id);
        const title = str(c.title) || 'Untitled chapter';
        if (!old) {
          changes.push(`Added chapter "${title}"`);
          continue;
        }
        if (str(old.title) !== str(c.title)) changes.push(`Renamed chapter "${str(old.title)}" to "${title}"`);
        if (pagesOf(old).length !== pagesOf(c).length) changes.push(`"${title}": pages ${pagesOf(old).length} → ${pagesOf(c).length}`);
        if (imageCount(old) !== imageCount(c)) changes.push(`"${title}": images ${imageCount(old)} → ${imageCount(c)}`);
        const texts = (x: Obj) => JSON.stringify(pagesOf(x).map((p) => p.description ?? null));
        const pics = (x: Obj) => JSON.stringify(pagesOf(x).map((p) => (Array.isArray(p.images) ? p.images.map((i) => asObj(i)?.imageUrl) : [])));
        if (pagesOf(old).length === pagesOf(c).length && texts(old) !== texts(c)) changes.push(`"${title}": page text changed`);
        if (imageCount(old) === imageCount(c) && pics(old) !== pics(c)) changes.push(`"${title}": images replaced or reordered`);
        if (str(old.musicUrl) !== str(c.musicUrl)) changes.push(`"${title}": music ${c.musicUrl ? (old.musicUrl ? 'replaced' : 'added') : 'removed'}`);
      }
      for (const old of before) if (!after.some((c) => c.id && c.id === old.id)) changes.push(`Removed chapter "${str(old.title)}"`);
    }

    return {
      change: `${noun}: ${short(str(content?.title ?? b?.title))}`,
      context: a?.requested === 'draft' ? [SAVED_IN_DRAFT] : [],
      fields: [
        ...fields(
          [
            { label: 'Title', show: (o, w) => plain(side(o, w).title) },
            { label: 'Category', show: (o, w) => (side(o, w).categoryId ? plain(name(side(o, w).categoryId, 'Category')) : text('None')) },
            { label: 'Minimum plan', show: (o, w) => plan(side(o, w).minimumPlan) },
            { label: 'Cover', show: (o, w) => file(side(o, w).coverUrl) ?? text('None') },
            { label: 'Description', show: (o, w) => plain(side(o, w).description) },
            ...(kind === 'RHYME'
              ? [
                  { label: 'Lyrics / text', show: (o: Obj, w: 'before' | 'after') => plain(side(o, w).lyrics) },
                  { label: 'Audio or video', show: (o: Obj, w: 'before' | 'after') => file(side(o, w).mediaUrl) ?? text('None') },
                ]
              : []),
            { label: 'Chapters', show: (o, w) => ({ kind: 'list', items: chaptersOf(side(o, w)).map(summary) }) },
          ],
          b,
          a,
          action,
        ),
        ...(changes.length ? [{ label: 'What changed', before: null, after: { kind: 'list' as const, items: changes.map(text) } }] : []),
      ],
    };
  },

  /**
   * An order update (API_REQUESTS #22). Audit only: orders never go through drafts. Both sides are
   * `{ status, trackingRef, trackingUrl, address }`; the order number comes from the audit text.
   */
  Order: (d, b, a, action) => {
    const number = /#(\d+)/.exec(d.label ?? '')?.[1];
    const address = (label: string, key: string): Spec => ({ label, show: (o) => plain(asObj(o.address)?.[key]) });
    return {
      change: number ? `Order #${number}` : 'Order',
      context: [],
      fields: fields(
        [
          field('Order status', 'status', enumText),
          field('Tracking reference', 'trackingRef'),
          field('Tracking link', 'trackingUrl'),
          address('Recipient', 'recipient'),
          address('Address line 1', 'line1'),
          address('Address line 2', 'line2'),
          address('City', 'city'),
          address('State / region', 'state'),
          address('Postcode', 'postcode'),
          address('Contact phone', 'phone'),
        ],
        b,
        a,
        action,
      ),
    };
  },

  /**
   * A plan (API_REQUESTS #20): the snapshot and the payload share field names (the payload adds
   * `requested`). Free is always active and free, so only its allowance can change.
   */
  Plan: (d, b, a, action, ctx) => {
    const tier = str(a?.tier ?? b?.tier ?? d.entityId);
    const memory = (o: Obj) => ('memoryLimit' in o ? text(o.memoryLimit === null ? 'Unlimited' : str(o.memoryLimit)) : null);
    return {
      change: `${tier in PLAN_LABELS ? PLAN_LABELS[tier as PlanTier] : humanize(tier)} plan`,
      context: a?.requested === 'draft' ? [SAVED_IN_DRAFT] : [],
      fields: fields(
        [
          { label: 'Status', show: (o) => (typeof o.active === 'boolean' ? text(o.active ? 'Active' : 'Inactive') : null) },
          { label: 'Memory items allowed', show: memory },
          ...priceSpecs(ctx, [b, a], (o) => asObj(o.prices)),
        ],
        b,
        a,
        action,
      ),
    };
  },

  /**
   * A shop product (API_REQUESTS #21). The snapshot is the live product; the payload is
   * `{ requested, content }`, like a story's.
   */
  Product: (_d, b, a, action, ctx) => {
    const side = (o: Obj, w: 'before' | 'after') => (w === 'after' ? (asObj(o.content) ?? {}) : o);
    const content = asObj(a?.content);
    const images = (o: Obj): DraftValue => {
      const items = (Array.isArray(o.images) ? o.images : []).flatMap((img, i) => file(asObj(img)?.url, i === 0 ? 'Cover image' : `Image ${i + 1}`) ?? []);
      return items.length ? { kind: 'list', items } : text('None');
    };
    const status = (v: unknown) => (typeof v === 'string' && v in PRODUCT_STATUS_LABELS ? text(PRODUCT_STATUS_LABELS[v as ProductStatus]) : enumText(v));
    const sideField = (label: string, key: string, as: (v: unknown) => DraftValue | null = plain): Spec => ({ label, show: (o, w) => as(side(o, w)[key]) });
    return {
      change: `Product: ${short(str(content?.title ?? b?.title))} (${str(content?.sku ?? b?.sku)})`,
      context: a?.requested === 'draft' ? [SAVED_IN_DRAFT] : [],
      fields: fields(
        [
          sideField('Product title', 'title'),
          sideField('SKU', 'sku'),
          sideField('Category', 'category'),
          sideField('Age recommendation', 'ageRecommendation'),
          sideField('Short description', 'description'),
          sideField('Full details / what is included', 'details'),
          sideField('Materials and care / safety information', 'materials'),
          sideField('Stock quantity', 'stock'),
          sideField('Status', 'status', status),
          { label: 'Images', show: (o, w) => images(side(o, w)) },
          ...priceSpecs(ctx, [b, a], (o, w) => asObj(side(o, w).prices)),
        ],
        b,
        a,
        action,
      ),
    };
  },

  /** A story / rhyme category: add, rename (or merge into another), delete with a replacement. */
  LibraryCategory: (d, b, a) => {
    const name = namer(d);
    const kind = str(b?.kind ?? a?.kind) === 'RHYME' ? 'rhyme' : 'story';
    if (a?.action === 'delete') {
      return {
        change: `Delete ${kind} category: ${str(b?.name)}`,
        context: [],
        fields: [
          { label: 'Name', before: plain(b?.name), after: null },
          ...(a.replacementId ? [{ label: 'Move content to', before: null, after: plain(name(a.replacementId, 'Another category')) }] : []),
        ],
      };
    }
    if (a?.action === 'rename') {
      // The saved label says whether it merges ("Merge category X into Y").
      const merge = typeof d.label === 'string' && d.label.startsWith('Merge');
      return {
        change: merge ? `${d.label} (${kind} categories)` : `Rename ${kind} category: ${str(b?.name)}`,
        context: merge ? ['Its stories or rhymes, pending changes and parents’ reading records move to the other category, and this one is removed.'] : [],
        fields: [{ label: 'Name', before: plain(b?.name), after: plain(a.name) }],
      };
    }
    return { change: `Add ${kind} category: ${str(a?.name)}`, context: [], fields: [{ label: 'Name', before: null, after: plain(a?.name) }] };
  },

  AssessmentConfig: (d, b, a, action) => {
    const name = namer(d);
    const region = name(d.entityId ?? d.regionId, '');
    const revision = typeof b?.revision === 'number' ? b.revision + 1 : null;
    const before = b ? rulesRows(b, 'before') : { areas: [], mandatory: [] };
    const after = a ? rulesRows(a, 'after') : { areas: [], mandatory: [] };
    // Area names come from the stored rules (they keep names) or from `names`.
    const areaName = (id: string) =>
      ([...before.areas, ...after.areas].find((x) => x.areaId === id && x.name)?.name as string | undefined) ?? name(id, 'Development area');
    const areaIds = [...new Set([...before.areas, ...after.areas].map((x) => str(x.areaId)))];
    const pickKeys = [...new Set([...before.mandatory, ...after.mandatory].map((m) => `${m.age}|${m.areaId}`))];
    const specs: Spec[] = [
      ...areaIds.flatMap((id): Spec[] => {
        const row = (o: Obj, w: 'before' | 'after') => (w === 'before' ? before : after).areas.find((x) => x.areaId === id) ?? null;
        return [
          { label: `${areaName(id)} · formula`, show: (o, w) => plain(row(o, w)?.formula) },
          { label: `${areaName(id)} · weight`, show: (o, w) => plain(row(o, w)?.weight) },
          {
            label: `${areaName(id)} · question weights`,
            show: (o, w) => {
              const q = asObj(row(o, w)?.questionWeights);
              return q ? text(`Easy ${str(q.EASY)} · Medium ${str(q.MEDIUM)} · Hard ${str(q.HARD)}`) : null;
            },
          },
        ];
      }),
      ...pickKeys.flatMap((key): Spec[] => {
        const [age, areaId] = key.split('|') as [string, string];
        const pick = (w: 'before' | 'after') => (w === 'before' ? before : after).mandatory.find((m) => m.age === age && m.areaId === areaId);
        return [
          {
            label: `Mandatory · ${age} years · ${areaName(areaId)}`,
            show: (_o, w) => {
              // The stored rules leave out empty sets: missing = none ticked, count 0.
              const p = pick(w);
              return text(p?.activityIds.length ? p.activityIds.map((id) => name(id, 'Activity')).join(', ') : 'None');
            },
          },
          { label: `Required completed · ${age} years · ${areaName(areaId)}`, show: (_o, w) => text(String(pick(w)?.count ?? 0)) },
        ];
      }),
    ];
    return {
      change: `Assessment rules${region ? `: ${region}` : ''}${revision ? `, version ${revision}` : ''}`,
      context: [],
      fields: fields(specs, b, a, action === 'remove' ? 'update' : action),
    };
  },
};

function regionContext(d: DraftApproval) {
  const region = namer(d)(d.regionId, '');
  return region ? [`Regional learning category: ${region}`] : [];
}

// ---- Fallback ---------------------------------------------------------------------------------------

/** Keys that are internal (ids, authors, ordering, flags) and never shown. */
const HIDDEN = /(^id$|Id$|Ids$|^authorId$|^createdById$|^requested$|^position$|^delete$|^sample$|At$)/;

/** "regularVisibleLimit" / "community.regular_visible" → "Regular visible limit"; "coverUrl" → "Cover". */
function humanizeKey(key: string) {
  const last = (key.split('.').pop() ?? key).replace(/(?<=.)Url$/, '');
  const words = last.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Any value, readably: files as thumbnails / file names, lists, Yes / No, nested objects as "key: value". */
function auto(v: unknown): DraftValue | null {
  if (v == null || v === '') return null;
  if (isUrl(v)) return file(v);
  if (typeof v === 'boolean') return yesNo(v);
  if (typeof v === 'string' && /^[A-Z][A-Z_]+$/.test(v)) return enumText(v);
  if (Array.isArray(v)) return { kind: 'list', items: v.map(auto).filter((x): x is DraftValue => x !== null) };
  const o = asObj(v);
  if (o) {
    const parts = Object.entries(o).filter(([k, x]) => !HIDDEN.test(k) && x != null && typeof x !== 'object').map(([k, x]) => `${humanizeKey(k)}: ${str(x)}`);
    return parts.length ? text(parts.join(' · ')) : null;
  }
  return text(str(v));
}

const fallback: Formatter = (d, b, a, action) => {
  const keys = [...new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})])].filter((k) => !HIDDEN.test(k));
  return {
    change: `${d.section} · ${humanize(d.entityType.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase())}`,
    weak: true,
    context: regionContext(d),
    fields: fields(keys.map((k) => field(humanizeKey(k), k, auto)), b, a, action),
  };
};

/** What a draft is and what it changes, readably. Uses the saved label when the formatter can't name it. */
export function formatDraft(d: DraftApproval, ctx: FormatContext = {}): FormattedDraft {
  const after = asObj(d.after);
  return formatChange(d, asObj(d.before), after, actionOf(d, after), ctx);
}

/**
 * The same formatting with the before / after and action given explicitly (Audit History reuses
 * it for saved changes, whose `after` is a snapshot rather than a draft payload).
 */
export function formatChange(d: DraftApproval, before: Obj | null, after: Obj | null, action: FormattedDraft['action'], ctx: FormatContext = {}): FormattedDraft {
  const { weak, action: own, ...out } = (FORMATTERS[d.entityType] ?? fallback)(d, before, after, action, ctx);
  return { ...out, action: own ?? action, change: weak && d.label ? d.label : out.change };
}
