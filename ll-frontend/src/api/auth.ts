import { api } from './client';
import type { AdminRole, PermissionSection } from '@/constants/permissions';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  permissions: PermissionSection[];
  /** "Allow direct publishing". When false, every change becomes a draft for Super Admin. */
  directPublish: boolean;
}

export async function login(email: string, password: string, remember: boolean) {
  const { data } = await api.post<{ token: string; admin: AdminUser }>('/auth/login', { email, password, remember });
  return data;
}

export async function fetchMe() {
  const { data } = await api.get<{ admin: AdminUser }>('/auth/me');
  return data.admin;
}
