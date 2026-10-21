import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toJson } from '../../common/utils/json';
import type { SessionAdmin } from '../../common/types/session-admin';

type Db = Prisma.TransactionClient | PrismaService;

export interface AuditInput {
  action: string;
  section?: string;
  entityType?: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}

/** Staff accountability log (guide §23). Append-only: rows are never updated or deleted. */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /** Pass the transaction client when recording a change, so the entry commits with it. */
  write(admin: SessionAdmin, input: AuditInput, db: Db = this.prisma) {
    return db.auditLog.create({
      data: {
        actorId: admin.id,
        actorName: admin.name,
        actorRole: admin.role,
        action: input.action,
        section: input.section,
        entityType: input.entityType,
        entityId: input.entityId ?? undefined,
        before: toJson(input.before),
        after: toJson(input.after),
      },
    });
  }

  async list(take: number, cursor?: string) {
    const entries = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    return { entries, nextCursor: entries.length === take ? (entries.at(-1)?.id ?? null) : null };
  }
}
