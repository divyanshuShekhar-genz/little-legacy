import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { isAxiosError } from 'axios';
import { tokenStore } from '@/api/client';
import { queryClient } from '@/api/queryClient';
import type { SectionAccess } from '@/constants/navigation';
import * as authApi from '@/api/auth';
import type { AdminUser } from '@/api/auth';

interface AuthState {
  admin: AdminUser | null;
  loading: boolean;
  signIn: (email: string, password: string, remember: boolean) => Promise<void>;
  signOut: () => void;
  can: (access: SectionAccess) => boolean;
  isSuperAdmin: boolean;
  /** True when this admin's saves go live immediately rather than to Draft approvals. */
  canPublish: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(() => Boolean(tokenStore.get()));

  // Restore the session. Only a 401 means the login is invalid (client.ts then clears it and
  // redirects). If the backend is simply not up yet (e.g. still compiling), keep the token and
  // retry, so starting the frontend first doesn't sign you out.
  useEffect(() => {
    if (!tokenStore.get()) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const restore = () =>
      authApi
        .fetchMe()
        .then((me) => {
          if (cancelled) return;
          setAdmin(me);
          setLoading(false);
        })
        .catch((e: unknown) => {
          if (cancelled) return;
          if (isAxiosError(e) && e.response?.status === 401) {
            tokenStore.clear();
            setLoading(false);
          } else {
            timer = setTimeout(restore, 2000);
          }
        });
    void restore();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string, remember: boolean) => {
    const { token, admin } = await authApi.login(email, password, remember);
    tokenStore.set(token, remember);
    setAdmin(admin);
  }, []);

  const signOut = useCallback(() => {
    tokenStore.clear();
    queryClient.clear();
    setAdmin(null);
  }, []);

  const value = useMemo<AuthState>(() => {
    const isSuperAdmin = admin?.role === 'SUPER_ADMIN';
    const can = (access: SectionAccess) => {
      if (!admin) return false;
      if (access === 'any' || isSuperAdmin) return true;
      if (access === 'superAdmin') return false;
      return admin.permissions.includes(access);
    };
    return {
      admin,
      loading,
      signIn,
      signOut,
      can,
      isSuperAdmin,
      canPublish: isSuperAdmin || Boolean(admin?.directPublish),
    };
  }, [admin, loading, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
