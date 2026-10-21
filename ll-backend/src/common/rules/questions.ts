/**
 * Questionnaire questions (guide §6). Difficulty, answer marks and skill links are ADMIN-ONLY:
 * "They are not labels for the parent to see." The parent app gets questions only through
 * toParentQuestion(), which copies the allowed fields one by one — never spreads the row.
 */

export interface ParentQuestion {
  id: string;
  text: string;
  options: { id: string; label: string }[];
}

export function toParentQuestion(q: { id: string; text: string; options: { id: string; label: string }[] }): ParentQuestion {
  return { id: q.id, text: q.text, options: q.options.map((o) => ({ id: o.id, label: o.label })) };
}
