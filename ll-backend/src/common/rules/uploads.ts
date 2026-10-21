/**
 * Upload rules shared by the admin file pickers and the backend validator.
 * The backend checks the type detected from the file's bytes against these lists.
 */

export const UPLOAD_KINDS = ['IMAGE', 'AUDIO', 'VIDEO', 'DOCUMENT'] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];

const MB = 1024 * 1024;

export const UPLOAD_RULES: Record<UploadKind, { mimeTypes: readonly string[]; maxBytes: number; label: string }> = {
  // SVG is deliberately excluded: it can carry scripts.
  IMAGE: { mimeTypes: ['image/png', 'image/jpeg', 'image/webp'], maxBytes: 5 * MB, label: 'PNG, JPG or WebP, up to 5 MB' },
  AUDIO: {
    mimeTypes: ['audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/wav', 'audio/x-wav', 'audio/vnd.wave'],
    maxBytes: 20 * MB,
    label: 'MP3, M4A, OGG or WAV, up to 20 MB',
  },
  VIDEO: { mimeTypes: ['video/mp4', 'video/webm'], maxBytes: 100 * MB, label: 'MP4 or WebM, up to 100 MB' },
  DOCUMENT: { mimeTypes: ['application/pdf'], maxBytes: 10 * MB, label: 'PDF, up to 10 MB' },
};

export const MAX_UPLOAD_BYTES = Math.max(...Object.values(UPLOAD_RULES).map((r) => r.maxBytes));

/** Which kind a detected MIME type belongs to, or null if it isn't allowed at all. */
export function uploadKindFor(mimeType: string): UploadKind | null {
  return UPLOAD_KINDS.find((k) => UPLOAD_RULES[k].mimeTypes.includes(mimeType)) ?? null;
}
