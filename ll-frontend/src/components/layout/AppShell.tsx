import { Outlet } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Note } from '@/components/ui/Panel';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_LABELS } from '@/constants/permissions';
import { downloadJson, errorMessage } from '@/api/client';
import { Sidebar } from './Sidebar';

const exportFile = (path: string, filename: string) =>
  downloadJson(path, filename).catch((e) => toast.error(errorMessage(e)));

export function AppShell() {
  const { admin, isSuperAdmin, canPublish, signOut } = useAuth();

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="ml-sidebar max-[650px]:ml-0">
        {/* Header text and buttons are 12px, as in the prototype (buttons inherit the header font). */}
        <header className="flex h-header items-center justify-between border-b border-line bg-white px-10 text-xs text-muted">
          <span>
            Workspace <b className="font-normal text-[#334155]">/ Administration</b>
          </span>
          {admin && (
            <div className="flex items-center gap-5">
              {isSuperAdmin && (
                <>
                  <Button size="sm" onClick={() => exportFile('/exports/assessment-settings', 'little-legacy-assessment-settings.json')}>
                    Export assessment settings
                  </Button>
                  <Button size="sm" onClick={() => exportFile('/exports/parent-settings', 'little-legacy-admin-settings.json')}>
                    Export parent settings
                  </Button>
                </>
              )}
              <span>
                <b className="font-semibold text-[#334155]">{admin.name}</b>
                <small className="mt-1 block text-[11px]">{ROLE_LABELS[admin.role]}</small>
              </span>
              <Button size="sm" onClick={signOut}>
                Sign out
              </Button>
            </div>
          )}
        </header>
        <main className="mx-auto max-w-page p-10">
          {!canPublish && (
            <Note className="mt-0">Your changes are saved as drafts. Super Admin publishes them after review.</Note>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
