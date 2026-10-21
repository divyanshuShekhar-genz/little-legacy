import { describe, expect, it } from 'vitest';
import { MAX_UPLOAD_BYTES, UPLOAD_RULES, uploadKindFor } from './uploads';

describe('upload rules', () => {
  it('maps detected MIME types to a kind', () => {
    expect(uploadKindFor('image/webp')).toBe('IMAGE');
    expect(uploadKindFor('audio/mpeg')).toBe('AUDIO');
    expect(uploadKindFor('application/pdf')).toBe('DOCUMENT');
  });
  it('rejects SVG and unknown types', () => {
    expect(uploadKindFor('image/svg+xml')).toBeNull();
    expect(uploadKindFor('application/x-msdownload')).toBeNull();
  });
  it('the overall limit is the largest per-kind limit', () => {
    expect(MAX_UPLOAD_BYTES).toBe(UPLOAD_RULES.VIDEO.maxBytes);
  });
});
