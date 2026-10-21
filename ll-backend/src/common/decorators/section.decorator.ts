import { SetMetadata } from '@nestjs/common';
import type { PermissionSection } from '../rules';

export const SECTION_KEY = 'section';

/**
 * Which admin-panel section a controller (or handler) belongs to. Checked by SectionGuard.
 * - a PermissionSection key → Super Admin, or a Sub Admin with that section assigned
 * - 'superAdmin'            → Super Admin only (never assignable)
 * Must match the section's `access` key in ll-frontend/src/constants/navigation.ts.
 */
export const RequireSection = (section: PermissionSection | 'superAdmin') => SetMetadata(SECTION_KEY, section);
