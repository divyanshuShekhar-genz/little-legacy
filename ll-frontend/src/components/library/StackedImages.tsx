import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { acceptFor, uploadFile } from '@/api/uploads';
import { errorMessage } from '@/api/client';
import { UPLOAD_RULES } from '@/constants/uploads';
import { moveItem, withPositions } from '@/utils/reorder';
import { newLibraryId, type LibraryPageImage } from './types';
import { LibraryImage } from './LibraryImage';
import { ReorderControls } from './ReorderControls';

/** The prototype's labels: the first image is the main image, the rest are stacked behind it. */
export const imageLabel = (index: number) => (index === 0 ? 'Main image' : `Stacked image ${index + 1}`);

/**
 * One page's stacked images, in order: add (upload), delete, reorder. Images have no
 * description; the page has one (OPEN_QUESTIONS Q4). Only this page's list changes.
 */
export function StackedImages({ images, onChange, disabled }: {
  images: LibraryPageImage[];
  onChange: (images: LibraryPageImage[]) => void;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const set = (next: LibraryPageImage[]) => onChange(withPositions(next));

  const add = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setProgress(0);
    try {
      const uploaded = await uploadFile(file, 'IMAGE', setProgress);
      set([...images, { id: newLibraryId('image'), position: images.length + 1, imageUrl: uploaded.url }]);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setProgress(null);
      if (input.current) input.current.value = '';
    }
  };

  const busy = progress !== null;

  return (
    <div className="grid gap-3 text-[12px] text-body">
      {images.map((image, i) => (
        <section key={image.id} className="flex flex-wrap items-center gap-[15px] rounded-md border border-line bg-white p-[15px]">
          <LibraryImage src={image.imageUrl} label={imageLabel(i)} className="h-[90px] w-[120px]" />
          <div className="grid gap-2">
            <strong>{imageLabel(i)}</strong>
            <ReorderControls index={i} count={images.length} label="image" disabled={disabled} onMove={(to) => set(moveItem(images, i, to))} />
          </div>
          <Button className="ml-auto" disabled={disabled} onClick={() => set(images.filter((x) => x.id !== image.id))}>
            Delete image
          </Button>
        </section>
      ))}
      <input ref={input} type="file" accept={acceptFor('IMAGE')} className="hidden" disabled={disabled || busy} onChange={(e) => add(e.target.files?.[0])} />
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => input.current?.click()} disabled={disabled || busy}>
          {busy ? `Uploading… ${progress}%` : images.length ? '+ Add stacked image' : '+ Add image'}
        </Button>
        {error ? <span className="text-danger">{error}</span> : <span className="text-muted">{UPLOAD_RULES.IMAGE.label}</span>}
      </div>
    </div>
  );
}
