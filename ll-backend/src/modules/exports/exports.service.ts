import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { SessionAdmin } from '../../common/types/session-admin';

/**
 * Header "Export parent settings" / "Export assessment settings" (prototype accounts.js,
 * assessment-ui.js). Grouped per regional learning category.
 */
@Injectable()
export class ExportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async parentSettings(admin: SessionAdmin) {
    const regions = await this.prisma.learningRegion.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        areas: {
          where: { removedAt: null },
          orderBy: { position: 'asc' },
          include: {
            categories: { where: { removedAt: null } },
            levels: { where: { OR: [{ categoryId: null }, { category: { removedAt: null } }] }, orderBy: { number: 'asc' } },
            questions: { orderBy: { position: 'asc' }, include: { options: { orderBy: { position: 'asc' } } } },
          },
        },
        activities: {
          where: { withdrawnAt: null },
          include: { steps: { orderBy: { position: 'asc' } }, previews: { orderBy: { position: 'asc' } } },
        },
      },
    });
    await this.audit.write(admin, { action: 'Exported parent settings' });
    return { type: 'little-legacy-admin-settings', exportedAt: new Date().toISOString(), regions };
  }

  async assessmentSettings(admin: SessionAdmin) {
    const regions = await this.prisma.learningRegion.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, assessmentConfigs: { orderBy: { revision: 'desc' }, take: 1 }, mandatoryActivities: true },
    });
    await this.audit.write(admin, { action: 'Exported assessment settings' });
    return {
      type: 'little-legacy-assessment-settings',
      exportedAt: new Date().toISOString(),
      regions: regions.map(({ assessmentConfigs, ...r }) => ({ ...r, current: assessmentConfigs[0] ?? null })),
    };
  }
}
