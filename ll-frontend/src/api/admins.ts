import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PermissionSection } from '@/constants/permissions';
import { api } from '@/api/client';
import type { AdminUser } from '@/api/auth';

// Pattern for every feature: query keys + typed hooks live in the feature's api.ts.
export const teamKeys = { all: ['admins'] as const };

/** A staff account as GET /api/admins returns it: the session fields plus whether it can sign in. */
export type TeamMember = AdminUser & { active: boolean };

export interface AdminInput {
  name: string;
  email: string;
  /** Required on create only. */
  password?: string;
  permissions: PermissionSection[];
  directPublish: boolean;
  /** Edit only. An inactive account can't sign in, and its open sessions stop working. */
  active?: boolean;
}

export function useAdmins() {
  return useQuery({
    queryKey: teamKeys.all,
    queryFn: async () => (await api.get<{ admins: TeamMember[] }>('/admins')).data.admins,
  });
}

export function useSaveAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: AdminInput }) =>
      id
        ? (await api.patch<{ admin: AdminUser }>(`/admins/${id}`, input)).data.admin
        : (await api.post<{ admin: AdminUser }>('/admins', input)).data.admin,
    onSuccess: () => qc.invalidateQueries({ queryKey: teamKeys.all }),
  });
}
