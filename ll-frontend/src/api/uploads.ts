import { UPLOAD_RULES, type UploadKind } from '@/constants/uploads';
import { api } from './client';

export interface UploadedFile {
  id: string;
  url: string;
  kind: UploadKind;
  mimeType: string;
  sizeBytes: number;
  originalName: string;
}

/**
 * Checks the file against the shared rules first (fast feedback), then uploads it.
 * The backend re-checks the real type from the file's bytes, so this is convenience, not security.
 */
export async function uploadFile(file: File, kind: UploadKind, onProgress?: (percent: number) => void) {
  const rule = UPLOAD_RULES[kind];
  if (!rule.mimeTypes.includes(file.type)) throw new Error(`Choose a file of type: ${rule.label}.`);
  if (file.size > rule.maxBytes) throw new Error(`File is too large. ${rule.label}.`);

  const body = new FormData();
  body.append('kind', kind);
  body.append('file', file);
  const { data } = await api.post<{ upload: UploadedFile }>('/uploads', body, {
    onUploadProgress: (e) => e.total && onProgress?.(Math.round((e.loaded / e.total) * 100)),
  });
  return data.upload;
}

/** `accept` attribute for a file input of this kind. */
export const acceptFor = (kind: UploadKind) => UPLOAD_RULES[kind].mimeTypes.join(',');

/**
 * The kind of an uploaded file, from its URL. Upload URLs are `/uploads/<kind>s/yyyy/mm/<id>.<ext>`
 * (ll-backend uploads.service), so the folder names the kind.
 */
export function uploadKindFromUrl(url: string): UploadKind | null {
  const match = /\/(image|audio|video|document)s\//.exec(url);
  return match ? (match[1]!.toUpperCase() as UploadKind) : null;
}
