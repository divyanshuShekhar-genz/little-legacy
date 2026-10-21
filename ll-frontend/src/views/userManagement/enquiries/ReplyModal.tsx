import { forwardRef, type InputHTMLAttributes, useLayoutEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { TextAreaField } from '@/components/ui/Field';
import { DecisionActions, type SaveMode } from '@/components/DecisionActions';
import { errorMessage } from '@/api/client';
import { DRAFT_SAVED } from '@/constants/messages';
import { CHANNEL_LABELS, useReplyToEnquiry, type Enquiry, type ReplyChannel } from '@/api/enquiries';

interface ReplyForm {
  body: string;
  email: boolean;
  inApp: boolean;
}

/**
 * Prototype admin-rebuild.js `enquiryWorkspace()` reply dialog (docs/API_REQUESTS.md #2).
 * Approve sends the reply; "Save in draft" keeps it unsent. The API stores a Sub Admin's Approve
 * as a draft for Super Admin unless they have direct publishing.
 */
export function ReplyModal({ enquiry, onClose }: { enquiry: Enquiry | null; onClose: () => void }) {
  const reply = useReplyToEnquiry();
  const { register, reset, getValues } = useForm<ReplyForm>();

  useLayoutEffect(() => {
    if (enquiry) reset({ body: '', email: true, inApp: false });
  }, [enquiry, reset]);

  const save = async (mode: SaveMode) => {
    if (!enquiry) return;
    const v = getValues();
    const channels: ReplyChannel[] = [];
    if (v.email) channels.push('EMAIL');
    if (v.inApp) channels.push('IN_APP');
    // Same checks, in the same order, as the prototype (the API checks them too).
    if (!channels.length) return void toast.error('Select Email, In-app notification, or both.');
    if (!v.body.trim()) return void toast.error('Enter a reply.');
    try {
      const result = await reply.mutateAsync({ id: enquiry.id, mode, body: v.body, channels });
      toast.success(
        result.status === 'published'
          ? `Reply sent by ${channels.map((c) => CHANNEL_LABELS[c]).join(' + ')}`
          : DRAFT_SAVED,
      );
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <Modal
      open={Boolean(enquiry)}
      onClose={onClose}
      title="Reply to enquiry"
      footer={<DecisionActions onClose={onClose} onSave={save} busy={reply.isPending} />}
    >
      {enquiry && (
        <form onSubmit={(e) => e.preventDefault()}>
          <p className="mb-6 mt-2 leading-[1.7] text-muted">
            {enquiry.parentName} · {enquiry.message}
          </p>
          <TextAreaField label="Reply" {...register('body')} />
          {/* Deliberately unlike the prototype: no groove border, and spaced from the Reply box. */}
          <fieldset className="mt-[18px]">
            <legend className="mb-[7px]">Send through</legend>
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <Channel label="Email" {...register('email')} />
              <Channel label="In-app notification" {...register('inApp')} />
            </div>
            <p className="mb-6 mt-2 leading-[1.7] text-muted">Select one or both channels.</p>
          </fieldset>
        </form>
      )}
    </Modal>
  );
}

/** The prototype's `.check` label with a native checkbox. */
export const Channel = forwardRef<HTMLInputElement, { label: string } & InputHTMLAttributes<HTMLInputElement>>(({ label, ...props }, ref) => (
  <label className="flex cursor-pointer items-center gap-3 rounded-card bg-[#f7f5f9] p-2.5">
    <input ref={ref} type="checkbox" className="m-[3px_3px_3px_4px]" {...props} />
    {label}
  </label>
));
Channel.displayName = 'Channel';
