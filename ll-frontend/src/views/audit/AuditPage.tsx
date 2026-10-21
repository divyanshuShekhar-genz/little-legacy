import { errorMessage } from '@/api/client';
import { useAuditLog } from '@/api/audit';
import { useCountries } from '@/api/countries';
import { useRegions } from '@/api/regions';
import { formatDateTime } from '@/utils/format';
import { ROLE_LABELS } from '@/constants/permissions';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { AUDIT_LABELS, DraftChanges } from '@/views/drafts/DraftChanges';
import { formatAuditEntry } from './formatAudit';

/**
 * Guide §23. Super Admin only; read-only staff accountability log, newest first, a page at a time
 * ("Load more"). Deliberately unlike the prototype (which lists each entry's raw Before / After in
 * a separate "Change details" panel): change details open inline under each row, written out as
 * Field · Before · After with the Draft approvals formatters (no ids or raw JSON).
 */
export function AuditPage() {
  const { data, isLoading, isError, error, hasNextPage, fetchNextPage, isFetchingNextPage } = useAuditLog();
  const rows = data?.pages.flatMap((p) => p.entries);
  // Country names and currencies for price changes (plans, products).
  const { data: countries } = useCountries();
  // And regional categories, which the audit log stores as ids (e.g. a checklist item's category).
  const { data: regions } = useRegions();

  return (
    <>
      <PageHeader
        eyebrow="Audit History"
        title="A clear record of every change."
        subtitle="Visible only to Super Admin. Includes changes made by Super Admin."
      />
      <Panel>
        <DataTable
          loading={isLoading}
          error={isError ? errorMessage(error) : undefined}
          rows={rows}
          rowKey={(e) => e.id}
          columns={[
            {
              header: 'Admin',
              cell: (e) => (
                <>
                  {e.actorName}
                  <span className="block text-[11px] text-muted">{ROLE_LABELS[e.actorRole as keyof typeof ROLE_LABELS] ?? e.actorRole}</span>
                </>
              ),
            },
            { header: 'Action', className: 'whitespace-normal', cell: (e) => e.action },
            { header: 'Timestamp', cell: (e) => formatDateTime(e.createdAt) },
            {
              header: 'Change details',
              className: 'whitespace-normal',
              cell: (e) => {
                const change = formatAuditEntry(e, { countries, regions });
                return change ? (
                  <details>
                    <summary className="cursor-pointer text-primary">View</summary>
                    {/* Kept to a fixed width so an open entry doesn't widen the whole table. */}
                    <div className="mt-2 w-[440px] max-w-full">
                      <p className="mb-2 text-[12px] font-semibold text-body">{change.change}</p>
                      {change.context.map((line) => (
                        <p key={line} className="mb-2 text-[12px] text-muted">
                          {line}
                        </p>
                      ))}
                      <DraftChanges draft={change} labels={AUDIT_LABELS} />
                    </div>
                  </details>
                ) : (
                  '—'
                );
              },
            },
          ]}
        />
        {hasNextPage && (
          <div className="mt-[18px] flex justify-center">
            <Button onClick={() => void fetchNextPage()} disabled={isFetchingNextPage}>
              {isFetchingNextPage ? 'Loading…' : 'Load more'}
            </Button>
          </div>
        )}
      </Panel>
    </>
  );
}
