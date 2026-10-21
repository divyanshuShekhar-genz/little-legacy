import { useLayoutEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { CheckboxField, TextAreaField, TextField } from '@/components/ui/Field';
import { DecisionActions } from '@/components/DecisionActions';
import { useSaveTeamPost, type TeamPost } from '@/api/community';
import { ExpiryFields, expiryDefaults } from './ExpiryFields';
import { sendDecision, type DecisionForm } from './decision';

type TeamPostForm = DecisionForm & { title: string };

/**
 * Prototype admin-rebuild.js `editTeamPost()`. Published as "Posted by Little Legacy team",
 * without going through the parent queue — but publishing permissions still apply.
 */
export function TeamPostModal({ open, post, onClose }: { open: boolean; post: TeamPost | null; onClose: () => void }) {
  const save = useSaveTeamPost();
  const { register, reset, getValues } = useForm<TeamPostForm>();

  useLayoutEffect(() => {
    if (open) {
      reset({
        title: post?.title ?? '',
        message: post?.message ?? '',
        reason: post?.rejectionReason ?? '',
        pinned: post?.pinned ?? false,
        ...expiryDefaults(post?.expiryHours ?? null),
      });
    }
  }, [open, post, reset]);

  const decide = async (action: 'approve' | 'reject', mode: 'publish' | 'draft') => {
    const { title, ...values } = getValues();
    if (!title.trim() || !values.message.trim()) {
      toast.error('Enter a title and message.');
      return;
    }
    const done = await sendDecision(action, mode, values, (d) => save.mutateAsync({ ...d, id: post?.id, title }), {
      approved: 'Team message published',
      rejected: 'Team message rejected',
    });
    if (done) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={post ? 'Edit team post' : 'Add team post'}
      footer={
        <DecisionActions
          busy={save.isPending}
          onClose={onClose}
          onSave={(mode) => decide('approve', mode)}
          onReject={() => decide('reject', 'publish')}
        />
      }
    >
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="grid">
          <TextField label="Title" {...register('title')} />
          <TextAreaField label="Message" {...register('message')} />
        </div>
        <ExpiryFields days={register('expiryDays', { valueAsNumber: true })} hours={register('expiryHours', { valueAsNumber: true })} />
        <div className="grid">
          <TextAreaField label="Reason for rejection" {...register('reason')} />
        </div>
        <CheckboxField className="mt-[18px]" label="Pin to top of the community feed" {...register('pinned')} />
      </form>
    </Modal>
  );
}
