import type { AdminUser } from '@prisma/client';

/** The signed-in admin, as set on `req.user` by JwtStrategy. Never includes the password hash. */
export type SessionAdmin = Omit<AdminUser, 'passwordHash'>;

export function toSessionAdmin({ passwordHash: _omit, ...admin }: AdminUser): SessionAdmin {
  return admin;
}

export const isSuperAdmin = (admin: SessionAdmin) => admin.role === 'SUPER_ADMIN';

/**
 * For things shared by several sections (e.g. the country list: Subscriptions and Shop & Orders),
 * where one @RequireSection key isn't enough. Super Admin always passes.
 */
export const hasAnySection = (admin: SessionAdmin, sections: readonly string[]) =>
  isSuperAdmin(admin) || sections.some((s) => admin.permissions.includes(s));

/** True when this admin's saves go live immediately rather than to Draft approvals. */
export const canPublish = (admin: SessionAdmin) => isSuperAdmin(admin) || admin.directPublish;
