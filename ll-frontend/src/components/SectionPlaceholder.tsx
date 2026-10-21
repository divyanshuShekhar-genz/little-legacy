import type { NavSection } from '@/constants/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

/** Stand-in for sections not built yet. Points the developer at the spec to build from. */
export function SectionPlaceholder({ section, back }: { section: NavSection; back?: { to: string; label: string } }) {
  return (
    <>
      <PageHeader eyebrow={section.label} title={section.label} subtitle={section.description} back={back} />
      <EmptyState
        title="Not built yet"
        message={
          <>
            Requirements: <b>{section.spec ?? 'docs/PRODUCT_SPEC.md'}</b> in docs/PRODUCT_SPEC.md, and the screen
            breakdown in docs/prototype/. Follow the Team &amp; Permissions module as the reference implementation.
          </>
        }
      />
    </>
  );
}
