import type { Prisma } from '@prisma/client';
import type { DraftRefs } from '../../common/utils/draft-refs';

type Db = Prisma.TransactionClient;

const short = (t: string, n = 60) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t);

/**
 * Current display names for the references found in drafts (API_REQUESTS #19), one query per
 * table for all drafts at once. Removed / withdrawn items still resolve (their rows remain);
 * hard-deleted ones are simply missing and the UI falls back. Ids are cuids, unique across tables.
 */
export async function resolveNames(db: Db, refs: DraftRefs): Promise<Record<string, string>> {
  const ids = [...refs.ids];
  const names: Record<string, string> = {};
  if (ids.length) {
    const where = { id: { in: ids } };
    const [areas, categories, levels, skills, regions, activities, groups, questions, options, enquiries, posts, libraryCategories, admins] = await Promise.all([
      db.developmentArea.findMany({ where, select: { id: true, name: true } }),
      db.activityCategory.findMany({ where, select: { id: true, name: true } }),
      db.level.findMany({ where, select: { id: true, number: true, area: { select: { name: true } } } }),
      db.skill.findMany({ where, select: { id: true, name: true } }),
      db.learningRegion.findMany({ where, select: { id: true, name: true } }),
      db.activity.findMany({ where, select: { id: true, title: true } }),
      db.activityFamily.findMany({ where, select: { id: true, name: true } }),
      db.question.findMany({ where, select: { id: true, text: true } }),
      db.questionOption.findMany({ where, select: { id: true, label: true } }),
      db.enquiry.findMany({ where, select: { id: true, parent: { select: { name: true } } } }),
      db.communityPost.findMany({ where, select: { id: true, title: true, parent: { select: { name: true } } } }),
      db.libraryCategory.findMany({ where, select: { id: true, name: true } }),
      db.adminUser.findMany({ where, select: { id: true, name: true } }),
    ]);
    for (const x of areas) names[x.id] = x.name;
    for (const x of categories) names[x.id] = x.name;
    for (const x of levels) names[x.id] = `${x.area.name} · Level ${x.number}`;
    for (const x of skills) names[x.id] = x.name;
    for (const x of regions) names[x.id] = x.name;
    for (const x of activities) names[x.id] = x.title;
    for (const x of groups) names[x.id] = x.name;
    for (const x of questions) names[x.id] = short(x.text);
    for (const x of options) names[x.id] = x.label;
    for (const x of enquiries) names[x.id] = x.parent.name; // an enquiry is named by the parent who asked
    for (const x of posts) names[x.id] = x.parent?.name ?? x.title ?? 'Little Legacy team';
    for (const x of libraryCategories) names[x.id] = x.name; // e.g. a campaign's story / rhyme filter
    for (const x of admins) names[x.id] = x.name; // e.g. a draft's `authorId`
  }
  if (refs.countryCodes.size) {
    const countries = await db.country.findMany({ where: { code: { in: [...refs.countryCodes] } }, select: { code: true, name: true } });
    for (const c of countries) names[c.code] = c.name;
  }
  return names;
}

/** What a draft answers or decides (#19): the enquiry for a reply, the parent's words for a review. */
export async function draftContexts(db: Db, drafts: { id: string; entityType: string; entityId: string | null; after: unknown }[]) {
  const enquiryIds = drafts
    .filter((d) => d.entityType === 'EnquiryReply')
    .map((d) => (d.after as { enquiryId?: unknown } | null)?.enquiryId)
    .filter((x): x is string => typeof x === 'string');
  const postIds = drafts.filter((d) => d.entityType === 'CommunityPostReview' && d.entityId).map((d) => d.entityId!);
  const [enquiries, posts] = await Promise.all([
    enquiryIds.length ? db.enquiry.findMany({ where: { id: { in: enquiryIds } }, select: { id: true, message: true } }) : [],
    postIds.length ? db.communityPost.findMany({ where: { id: { in: postIds } }, select: { id: true, message: true, originalMessage: true } }) : [],
  ]);
  const context: Record<string, string | null> = {};
  for (const d of drafts) {
    if (d.entityType === 'EnquiryReply') {
      const id = (d.after as { enquiryId?: unknown } | null)?.enquiryId;
      context[d.id] = enquiries.find((e) => e.id === id)?.message ?? null;
    } else if (d.entityType === 'CommunityPostReview') {
      const post = posts.find((p) => p.id === d.entityId);
      context[d.id] = post ? (post.originalMessage ?? post.message) : null;
    } else {
      context[d.id] = null;
    }
  }
  return context;
}
