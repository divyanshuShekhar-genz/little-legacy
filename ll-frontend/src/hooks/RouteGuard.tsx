import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { SectionAccess } from '@/constants/navigation';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from './useAuth';

/**
 * Route guard: signed in, and (optionally) allowed into a section, or for a hub (`anyOf`) into at
 * least one of its sections.
 */
export function RouteGuard({ access, anyOf, children }: { access?: SectionAccess; anyOf?: SectionAccess[]; children: ReactNode }) {
  const { admin, loading, can } = useAuth();
  const location = useLocation();

  if (loading) return <div className="p-10 text-muted">Loading…</div>;
  if (!admin) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if ((access && !can(access)) || (anyOf && !anyOf.some(can))) {
    return (
      <EmptyState
        title="No access to this section"
        message="Ask a Super Admin to assign this section to your account."
      />
    );
  }
  return <>{children}</>;
}
