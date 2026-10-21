import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DraftsService } from '../drafts/drafts.service';

/**
 * Key/value settings (`settings` table), e.g. `community.regularVisibleLimit`.
 * Changes go through the draft workflow like any other published config:
 * `drafts.saveOrDraft({ entityType: SETTING_ENTITY, entityId: key, payload: { value } })`.
 */
export const SETTING_ENTITY = 'Setting';

@Injectable()
export class SettingsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly drafts: DraftsService,
  ) {}

  onModuleInit() {
    this.drafts.register<{ value: Prisma.InputJsonValue }>(SETTING_ENTITY, {
      // A setting always "exists" (it may just not be stored yet), so drafts can create it.
      snapshot: async (tx, key) => {
        const row = await tx.setting.findUnique({ where: { key } });
        return { key, value: row?.value ?? null };
      },
      apply: async (tx, key, { value }) => {
        if (!key) throw new BadRequestException('A setting key is required.');
        await tx.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
        return key;
      },
    });
  }

  async get<T>(key: string, fallback: T): Promise<T> {
    const row = await this.prisma.setting.findUnique({ where: { key } });
    return row ? (row.value as T) : fallback;
  }
}
