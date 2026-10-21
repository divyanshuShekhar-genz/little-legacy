import { toast } from 'sonner';
import { errorMessage } from '@/api/client';
import type { SaveResult } from '@/api/community';
import { DRAFT_SAVED } from '@/constants/messages';

/**
 * Runs an API write from an Activity Management editor and toasts the outcome: live, or saved as
 * a draft for Super Admin (the prototype's wording). API errors are shown as they come; they use
 * the prototype's messages. Returns the result, or null if it failed.
 */
export async function saveWith(write: () => Promise<SaveResult>, published: string): Promise<SaveResult | null> {
  try {
    const result = await write();
    toast.success(result.status === 'draft' ? DRAFT_SAVED : published);
    return result;
  } catch (e) {
    toast.error(errorMessage(e));
    return null;
  }
}
