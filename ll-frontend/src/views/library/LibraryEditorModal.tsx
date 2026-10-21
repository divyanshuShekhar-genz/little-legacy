import { useLayoutEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Note } from '@/components/ui/Panel';
import { FormGrid, SelectField, TextAreaField, TextField } from '@/components/ui/Field';
import { FileUpload } from '@/components/ui/FileUpload';
import { PlanSelect } from '@/components/ui/PlanSelect';
import { DecisionActions, type SaveMode } from '@/components/DecisionActions';
import { ChapterList } from '@/components/library/ChapterList';
import { LibraryPreview } from '@/components/library/LibraryPreview';
import type { LibraryChapter, LibraryKind } from '@/components/library/types';
import { errorMessage } from '@/api/client';
import { useLibraryCategories, useLibraryItem, useRejectLibraryItem, useSaveLibraryItem } from '@/api/library';
import { DRAFT_SAVED } from '@/constants/messages';
import { useAuth } from '@/hooks/useAuth';
import { useApprovePending } from '@/hooks/useApprovePending';
import type { PlanTier } from '@/constants/plans';
import { itemError, newChapters, type LibraryContent } from './data';
import { LIBRARY_CONFIG } from './config';

interface DetailsForm {
  title: string;
  categoryId: string;
  minimumPlan: PlanTier;
  description: string;
  lyrics: string;
}

/**
 * "Add Story" / "Edit Story" and "Add Rhyme" / "Edit Rhyme" (guide §14–15; prototype workspace.js
 * `storyEditor`, which serves both). Details, then chapters → pages → stacked images, with an
 * Edit / Preview switch. A rhyme has exactly one chapter, plus "Lyrics / text" and its own audio
 * or video. An item with an unpublished change opens on that change; parents keep seeing the
 * published version until it's approved. Connected to docs/API_REQUESTS.md #17 / #18: the API's
 * messages show as they are (file checks on publish, a chapter children have read). After a first
 * publish the draft's id becomes a real item id, so the editor closes and the list refetches.
 * An existing item shows "Loading…" instead of the form until it arrives, so nothing typed early
 * is overwritten by the loaded content.
 * Super Admin's Approve on an unedited pending change approves that draft (useApprovePending).
 */
export function LibraryEditorModal({ kind, open, itemId, onClose }: { kind: LibraryKind; open: boolean; itemId: string | null; onClose: () => void }) {
  const config = LIBRARY_CONFIG[kind];
  const { isSuperAdmin } = useAuth();
  const { data: item, isError: itemFailed, error: loadError } = useLibraryItem(kind, itemId);
  // An existing item shows no form until it has arrived, so nothing typed early is overwritten when it loads.
  const waiting = Boolean(itemId) && !item;
  const { data: categories } = useLibraryCategories(kind);
  const save = useSaveLibraryItem(kind);
  const reject = useRejectLibraryItem(kind);
  const { register, reset, getValues, watch } = useForm<DetailsForm>();
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [chapters, setChapters] = useState<LibraryChapter[]>([]);
  const [view, setView] = useState<'edit' | 'preview'>('edit');
  // What was loaded, to tell whether the pending change has been edited.
  const loadedContent = useRef('');

  // Load once per opening, as soon as the item has arrived; later refetches (e.g. after saving)
  // don't overwrite the form.
  const loadedFor = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (!open) {
      loadedFor.current = null;
      return;
    }
    const key = itemId ?? 'new';
    if (loadedFor.current === key || (itemId && !item)) return;
    loadedFor.current = key;
    const source = item?.pending?.content ?? item;
    reset({
      title: source?.title ?? '',
      categoryId: source?.categoryId ?? '',
      minimumPlan: source?.minimumPlan ?? 'FREE',
      description: source?.description ?? '',
      lyrics: source?.lyrics ?? '',
    });
    setCoverUrl(source?.coverUrl ?? null);
    setMediaUrl(source?.mediaUrl ?? null);
    setChapters(source?.chapters ?? newChapters(kind));
    setView('edit');
    loadedContent.current = source ? same(source) : '';
  }, [open, itemId, item]);

  const awaitingApproval = Boolean(item && (item.pending?.status === 'PENDING_APPROVAL' || item.status === 'PENDING_APPROVAL'));

  /** The content as the API would store it, for comparing (blank text = null). */
  const same = (c: LibraryContent) =>
    JSON.stringify([
      c.title.trim(),
      c.categoryId || null,
      c.coverUrl,
      c.description?.trim() || null,
      c.minimumPlan,
      c.chapters,
      config.media ? c.mediaUrl : null,
      config.media ? c.lyrics?.trim() || null : null,
    ]);

  const content = (): LibraryContent => {
    const v = getValues();
    return {
      title: v.title,
      categoryId: v.categoryId || null,
      coverUrl,
      description: v.description.trim() || null,
      minimumPlan: v.minimumPlan,
      chapters,
      mediaUrl: config.media ? mediaUrl : null,
      lyrics: config.media ? v.lyrics : null,
    };
  };

  watch(); // re-render on every field change, so the footer note stays current
  // A pending change, or a never-published item (its draft is the whole item).
  const pending = useApprovePending(item?.draftId, Boolean(item?.draftId) && same(content()) === loadedContent.current);

  const busy = save.isPending || reject.isPending || pending.isPending;

  const onSave = async (mode: SaveMode) => {
    const c = content();
    const error = itemError(kind, c, mode);
    if (error) return void toast.error(error);
    try {
      if (mode === 'publish' && pending.viaDraft) {
        await pending.approve();
        toast.success(`${config.Noun} published`);
        return onClose();
      }
      const result = await save.mutateAsync({ id: item?.id, mode, content: c });
      toast.success(
        result.status === 'published' ? `${config.Noun} published` : DRAFT_SAVED,
      );
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const onReject = async () => {
    if (!item) return;
    try {
      const result = await reject.mutateAsync(item.id);
      toast.success(result.status === 'rejected' ? 'Change rejected. Parents still see the published version.' : `${config.Noun} returned to draft`);
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${itemId ? 'Edit' : 'Add'} ${config.Noun}`}
      footer={
        <DecisionActions onClose={onClose} onSave={onSave} onReject={onReject} showReject={isSuperAdmin && awaitingApproval} busy={busy} loading={waiting} note={pending.note} />
      }
    >
      {waiting ? (
        // Same look as a loading table (DataTable).
        <p className={itemFailed ? 'p-[45px] text-center text-danger' : 'p-[45px] text-center text-muted'}>
          {itemFailed ? errorMessage(loadError) : 'Loading…'}
        </p>
      ) : (
        <>
          {item?.pending && (
            <Note className="mt-0">
              {item.pending.status === 'PENDING_APPROVAL'
                ? 'This change is waiting for Super Admin approval.'
                : `You are editing a saved draft of this ${config.noun}.`}{' '}
              Parents still see the published version.
            </Note>
          )}

          <div className="mb-[18px] flex gap-2" role="group" aria-label="Editor view">
            <Button size="sm" variant={view === 'edit' ? 'primary' : 'default'} aria-pressed={view === 'edit'} onClick={() => setView('edit')}>
              Edit
            </Button>
            <Button size="sm" variant={view === 'preview' ? 'primary' : 'default'} aria-pressed={view === 'preview'} onClick={() => setView('preview')}>
              Preview
            </Button>
          </div>

          {view === 'preview' ? (
            <LibraryPreview title={watch('title')} chapters={chapters} mediaUrl={config.media ? mediaUrl : undefined} lyrics={config.media ? watch('lyrics') : undefined} />
          ) : (
            <form onSubmit={(e) => e.preventDefault()} className="grid gap-[18px]">
              <FormGrid>
                <TextField label={`${config.Noun} title`} {...register('title')} />
                <SelectField
                  label="Category"
                  {...register('categoryId')}
                  options={[{ value: '', label: 'Choose a category' }, ...(categories ?? []).map((c) => ({ value: c.id, label: c.name }))]}
                />
                <PlanSelect {...register('minimumPlan')} />
                <TextAreaField label={`${config.Noun} description`} {...register('description')} />
              </FormGrid>
              <FileUpload label="Cover · Add image" kind="IMAGE" value={coverUrl} onChange={setCoverUrl} disabled={busy} />
              {config.media && (
                // The prototype's editor card with "Lyrics / text" and the rhyme's media. Media is an
                // uploaded audio or video file, not a link (OPEN_QUESTIONS Q15).
                // Stacked full width, so the two-kind file hint fits on one line.
                <section className="grid gap-[18px] rounded-md border border-line p-[15px]">
                  <TextAreaField label="Lyrics / text" {...register('lyrics')} />
                  <FileUpload label="Audio / video" kind={['AUDIO', 'VIDEO']} value={mediaUrl} onChange={setMediaUrl} disabled={busy} />
                </section>
              )}
              <ChapterList chapters={chapters} onChange={setChapters} singleChapter={config.singleChapter} disabled={busy} />
            </form>
          )}
        </>
      )}
    </Modal>
  );
}
