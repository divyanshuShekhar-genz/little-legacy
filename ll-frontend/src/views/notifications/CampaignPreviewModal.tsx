import { useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { DecisionActions, type SaveMode } from '@/components/DecisionActions';
import { RejectReasonModal } from '@/components/RejectReasonModal';
import { errorMessage } from '@/api/client';
import { useCampaigns, useSaveCampaign } from '@/api/campaigns';
import { useDecideDraft } from '@/api/drafts';
import { useAuth } from '@/hooks/useAuth';
import { useApprovePending } from '@/hooks/useApprovePending';
import { plural } from '@/utils/format';
import { DRAFT_SAVED } from '@/constants/messages';
import { channelText, sameCampaign, type AudiencePreview, type Campaign, type CampaignContent } from './data';
import { RecipientNames } from './RecipientNames';

const pText = 'mb-6 mt-2 leading-[1.7] text-muted';

/**
 * Prototype "Preview notification": the title, message, matching parents and channels. Approve
 * sends it (one message per parent; the server counts the audience again at that moment); a Sub
 * Admin submits it for approval instead. A waiting campaign opened from the page is saved in place
 * (`draftId`). Super Admin: Approve on an unedited waiting campaign approves that draft
 * (useApprovePending), and Reject (only for one waiting for approval) asks for a reason, as for
 * plans. After sending, the toast uses the sent campaign's own count.
 */
export function CampaignPreviewModal({ open, campaign, content, audience, onClose, onDone }: {
  open: boolean;
  /** The saved campaign being edited, if any. */
  campaign: Campaign | null;
  content: CampaignContent;
  audience: AudiencePreview;
  onClose: () => void;
  onDone: () => void;
}) {
  const { isSuperAdmin } = useAuth();
  const save = useSaveCampaign();
  const decide = useDecideDraft();
  const { refetch } = useCampaigns();
  const [rejecting, setRejecting] = useState(false);
  const pending = useApprovePending(campaign?.draftId, Boolean(campaign?.draftId) && sameCampaign(content) === sameCampaign(campaign!));

  /** The sent campaign's own count (counted again by the server when it was sent). */
  const sentCount = async (id: string) => (await refetch()).data?.find((c) => c.id === id)?.recipientCount ?? audience.count;

  const onSave = async (mode: SaveMode) => {
    try {
      if (mode === 'publish' && pending.viaDraft) {
        const { data } = await pending.approve();
        toast.success(`Sent notification to ${plural(await sentCount((data as { id: string }).id), 'parent')}`);
        return onDone();
      }
      const result = await save.mutateAsync({ mode, content, draftId: campaign?.draftId });
      toast.success(result.status === 'draft' ? DRAFT_SAVED : `Sent notification to ${plural(await sentCount(result.id), 'parent')}`);
      onDone();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const onReject = async (reason: string) => {
    if (!campaign?.draftId) return;
    try {
      await decide.mutateAsync({ id: campaign.draftId, decision: 'reject', reason });
      toast.success('Notification rejected');
      setRejecting(false);
      onDone();
    } catch (e) {
      toast.error(errorMessage(e));
      throw e;
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Preview notification"
      footer={
        <DecisionActions
          onClose={onClose}
          onSave={onSave}
          onReject={() => setRejecting(true)}
          showReject={isSuperAdmin && campaign?.status === 'PENDING_APPROVAL'}
          busy={save.isPending || decide.isPending || pending.isPending}
          note={pending.note}
        />
      }
    >
      {open && (
        <>
          <h3>{content.title}</h3>
          <p className="mb-6 mt-2 whitespace-pre-line leading-[1.7]">{content.message}</p>
          <p className={pText}>
            {plural(audience.count, 'parent')} · {channelText(content.channels)}
          </p>
          <p className={pText}>
            <RecipientNames names={audience.parents.map((p) => p.name)} total={audience.count} />
          </p>
        </>
      )}
      <RejectReasonModal
        open={rejecting}
        onClose={() => setRejecting(false)}
        onReject={onReject}
        busy={decide.isPending}
        title="Reject this notification?"
        text="Nothing is sent. The author sees the reason in Draft approvals."
      />
    </Modal>
  );
}
