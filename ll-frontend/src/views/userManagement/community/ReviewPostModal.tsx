import { useLayoutEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '@/components/ui/Modal';
import { CheckboxField, TextAreaField } from '@/components/ui/Field';
import { DecisionActions } from '@/components/DecisionActions';
import { useReviewPost, type ParentPost } from '@/api/community';
import { ExpiryFields, expiryDefaults } from './ExpiryFields';
import { sendDecision, type DecisionForm } from './decision';

/**
 * Prototype admin-rebuild.js `moderateMessage()`. The parent's original words stay visible and
 * are preserved; "Message to show" is what parents see. Reject here rejects the post.
 */
export function ReviewPostModal({ post, onClose }: { post: ParentPost | null; onClose: () => void }) {
  const review = useReviewPost();
  const { register, reset, getValues } = useForm<DecisionForm>();

  useLayoutEffect(() => {
    if (post) reset({ message: post.message, reason: '', pinned: post.pinned, ...expiryDefaults(post.expiryHours) });
  }, [post, reset]);

  const decide = async (action: 'approve' | 'reject', mode: 'publish' | 'draft') => {
    if (!post) return;
    const done = await sendDecision(action, mode, getValues(), (d) => review.mutateAsync({ ...d, id: post.id }), {
      approved: 'Message approved',
      rejected: 'Message rejected',
    });
    if (done) onClose();
  };

  return (
    <Modal
      open={Boolean(post)}
      onClose={onClose}
      title="Review parent message"
      footer={
        <DecisionActions
          busy={review.isPending}
          onClose={onClose}
          onSave={(mode) => decide('approve', mode)}
          onReject={() => decide('reject', 'publish')}
        />
      }
    >
      {post && (
        <form onSubmit={(e) => e.preventDefault()}>
          <p className="mb-6 leading-[1.7] text-muted">From {post.parentName}</p>
          <blockquote className="mx-10 my-[1em] text-black">{post.originalMessage}</blockquote>
          <div className="grid">
            <TextAreaField label="Message to show" {...register('message')} />
            <TextAreaField label="Reason for rejection" {...register('reason')} />
          </div>
          <ExpiryFields days={register('expiryDays', { valueAsNumber: true })} hours={register('expiryHours', { valueAsNumber: true })} />
          <CheckboxField label="Pin to top of the community feed" {...register('pinned')} />
        </form>
      )}
    </Modal>
  );
}
