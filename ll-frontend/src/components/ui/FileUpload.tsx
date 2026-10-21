import { useId, useRef, useState } from 'react';
import { UPLOAD_RULES, type UploadKind } from '@/constants/uploads';
import { acceptFor, uploadFile, uploadKindFromUrl } from '@/api/uploads';
import { errorMessage } from '@/api/client';
import { Button } from './Button';

/**
 * Single-file picker for any upload kind: "Cover · Add image", chapter music, product images...
 * Controlled by URL: `value` is the stored file URL (or null), `onChange` receives the new one.
 * Mirrors the prototype's `.uploaded-preview` (120×90) with Replace / Remove actions.
 * `kind` can list several kinds (e.g. a rhyme's audio or video); the picked file's type decides.
 */
export function FileUpload({ label, kind, value, onChange, disabled }: {
  label: string;
  kind: UploadKind | UploadKind[];
  value: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}) {
  const kinds = Array.isArray(kind) ? kind : [kind];
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setProgress(0);
    try {
      // The first kind whose types match; otherwise the first kind, so uploadFile explains what's allowed.
      const fileKind = kinds.find((k) => UPLOAD_RULES[k].mimeTypes.includes(file.type)) ?? kinds[0]!;
      const uploaded = await uploadFile(file, fileKind, setProgress);
      onChange(uploaded.url);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setProgress(null);
      if (input.current) input.current.value = '';
    }
  };

  const busy = progress !== null;
  const shown = value ? (kinds.length === 1 ? kinds[0] : uploadKindFromUrl(value)) : null;

  return (
    <div className="grid gap-[7px] text-xs text-body">
      <label htmlFor={inputId}>{label}</label>
      <input
        ref={input}
        id={inputId}
        type="file"
        accept={kinds.map(acceptFor).join(',')}
        className="hidden"
        disabled={disabled || busy}
        onChange={(e) => pick(e.target.files?.[0])}
      />

      {value && shown === 'IMAGE' && <img src={value} alt="" className="h-[90px] w-[120px] rounded-card object-cover" />}
      {value && shown === 'AUDIO' && <audio src={value} controls className="w-full max-w-sm" />}
      {value && shown === 'VIDEO' && <video src={value} controls className="w-full max-w-sm rounded-card" />}
      {value && (shown === 'DOCUMENT' || shown === null) && (
        <a href={value} target="_blank" rel="noreferrer" className="text-primary hover:underline">
          Open file
        </a>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => input.current?.click()} disabled={disabled || busy}>
          {busy ? `Uploading… ${progress}%` : value ? 'Replace' : `Add ${kinds.length === 1 && kinds[0] === 'IMAGE' ? 'image' : 'file'}`}
        </Button>
        {value && !busy && (
          <Button variant="ghost" onClick={() => onChange(null)} disabled={disabled}>
            Remove
          </Button>
        )}
      </div>
      {error ? <span className="text-danger">{error}</span> : <span className="text-muted">{kinds.map((k) => UPLOAD_RULES[k].label).join(' · ')}</span>}
    </div>
  );
}
