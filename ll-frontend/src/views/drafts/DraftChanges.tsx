import { LibraryImage } from '@/components/library/LibraryImage';
import { uploadKindFromUrl } from '@/api/uploads';
import type { DraftValue, FormattedDraft } from './formatters';

const FILE_LABELS = { AUDIO: 'Audio file', VIDEO: 'Video file', DOCUMENT: 'Document', IMAGE: 'Image' } as const;

/** One display value: text, a list, an image thumbnail, a file reference or a colour swatch. */
function Value({ value }: { value: DraftValue | null }) {
  if (!value) return <span className="text-faint">—</span>;
  switch (value.kind) {
    case 'text':
      return <span className="whitespace-pre-line">{value.text}</span>;
    case 'list':
      return value.items.length ? (
        <ul className="grid gap-1.5">
          {value.items.map((item, i) => (
            <li key={i}>
              <Value value={item} />
            </li>
          ))}
        </ul>
      ) : (
        <span className="text-faint">None</span>
      );
    case 'image':
      return (
        <span className="inline-flex items-center gap-2.5">
          <LibraryImage src={value.url} label={value.caption ?? 'Image'} className="h-12 w-16 shrink-0" compact />
          {value.caption && <span>{value.caption}</span>}
        </span>
      );
    case 'file': {
      const ext = value.url.split('.').pop()?.toUpperCase();
      return (
        <span>
          {FILE_LABELS[uploadKindFromUrl(value.url) ?? 'DOCUMENT']}
          {ext && ext.length <= 4 ? ` (${ext})` : ''} ·{' '}
          <a href={value.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
            Open
          </a>
        </span>
      );
    }
    case 'colour':
      return (
        <span className="inline-flex items-center gap-2">
          {/* The colour itself is data (a level's icon colour), so it's an inline style, not a token. */}
          <span className="inline-block h-4 w-4 rounded border border-line" style={{ backgroundColor: value.hex }} />
          {value.hex}
        </span>
      );
  }
}

/** Column headings: a draft proposes a change; an audit entry records one that was made. */
export interface ChangeLabels {
  before: string;
  after: string;
  created: string;
  removed: string;
}
const DRAFT_LABELS: ChangeLabels = { before: 'Before', after: 'Proposed', created: 'Proposed', removed: 'Current (will be removed)' };
export const AUDIT_LABELS: ChangeLabels = { before: 'Before', after: 'After', created: 'Value', removed: 'Before (removed)' };

/**
 * A draft's changes as Field · Before · Proposed (deliberately unlike the prototype's raw JSON).
 * New items show only Proposed; removals only the current values.
 */
export function DraftChanges({ draft, labels = DRAFT_LABELS }: { draft: FormattedDraft; labels?: ChangeLabels }) {
  const { action, fields } = draft;
  if (fields.length === 0) return <p className="text-muted">No visible changes.</p>;
  const headers = action === 'create' ? ['Field', labels.created] : action === 'remove' ? ['Field', labels.removed] : ['Field', labels.before, labels.after];

  return (
    <div className="overflow-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} className="border-b border-line px-3 py-3 text-[12px] font-semibold text-muted first:pl-0">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {fields.map((f) => (
            <tr key={f.label}>
              <th scope="row" className="w-[28%] border-b border-line px-3 py-3 align-top text-[12px] font-semibold text-body first:pl-0">
                {f.label}
              </th>
              {action !== 'create' && (
                <td className="border-b border-line px-3 py-3 align-top text-sm">
                  <Value value={f.before} />
                </td>
              )}
              {action !== 'remove' && (
                <td className="border-b border-line px-3 py-3 align-top text-sm">
                  <Value value={f.after} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
