import type { QuestionInput, QuestionOption } from '@/api/questions';

/** Prototype message for any problem with the "label | marks" lines (also the API's). */
export const OPTIONS_MESSAGE = 'Add at least two options with non-negative marks: label | marks';

/** A new question's lines, as in the prototype. */
export const DEFAULT_OPTION_LINES = 'New to this | 0\nWith help | 10';

const LINE = /^(.*\S)\s*\|\s*(\d+(?:\.\d+)?)\s*$/;

/** The options as the editor's "label | marks" lines. */
export const optionLines = (options: QuestionOption[]) => options.map((o) => `${o.label} | ${o.marks}`).join('\n');

/**
 * Turns the "label | marks" lines back into options, or null when they're invalid.
 * Existing option ids are kept (the parent app stores them, OPEN_QUESTIONS Q22, and skill mappings
 * hang on them): a line keeps the id of the option with the same label; a changed label takes the
 * next unmatched existing option, in order (an edited answer); anything left over is a new option.
 */
export function parseOptionLines(text: string, existing: QuestionOption[] = []): QuestionInput['options'] | null {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const parsed = lines.map((l) => LINE.exec(l));
  if (lines.length < 2 || parsed.some((m) => !m)) return null;
  const rows = parsed.map((m) => ({ label: m![1]!.trim(), marks: Number(m![2]) }));

  const free = [...existing];
  const take = (match: (o: QuestionOption) => boolean) => {
    const i = free.findIndex(match);
    return i < 0 ? undefined : free.splice(i, 1)[0]!.id;
  };
  const ids = rows.map((r) => take((o) => o.label.toLowerCase() === r.label.toLowerCase()));
  return rows.map((r, i) => ({ id: ids[i] ?? take(() => true), label: r.label, marks: r.marks }));
}
