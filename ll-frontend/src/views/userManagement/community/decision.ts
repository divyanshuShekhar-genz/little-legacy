import { toast } from 'sonner';
import { errorMessage } from '@/api/client';
import type { SaveMode } from '@/components/DecisionActions';
import type { Decision, SaveResult } from '@/api/community';
import { DRAFT_SAVED } from '@/constants/messages';

export type DecisionForm = Omit<Decision, 'mode' | 'action'>;

/** Prototype checks (same messages), run before sending. Returns false if invalid. */
function valid(action: Decision['action'], v: DecisionForm) {
  if (action === 'reject' && !v.reason.trim()) {
    toast.error('Give a reason for rejection.');
    return false;
  }
  const { expiryDays: d, expiryHours: h } = v;
  if (!Number.isInteger(d) || d < 0 || d > 36500 || !Number.isInteger(h) || h < 0 || h > 23) {
    toast.error('Use whole days and hours from 0 to 23.');
    return false;
  }
  return true;
}

/**
 * Send an Approve / Reject / Save-in-draft decision. The server decides whether it publishes or
 * becomes a draft (no direct-publish permission), and the toast reflects what actually happened.
 */
export async function sendDecision(
  action: Decision['action'],
  mode: SaveMode,
  values: DecisionForm,
  send: (d: Decision) => Promise<SaveResult>,
  labels: { approved: string; rejected: string },
) {
  if (!valid(action, values)) return false;
  try {
    const result = await send({ ...values, action, mode });
    toast.success(result.status === 'draft' ? DRAFT_SAVED : action === 'reject' ? labels.rejected : labels.approved);
    return true;
  } catch (e) {
    toast.error(errorMessage(e));
    return false;
  }
}
