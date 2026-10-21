import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { toSessionAdmin, type SessionAdmin } from '../../common/types/session-admin';
import type { CreateAdminDto } from './dto/create-admin.dto';
import type { UpdateAdminDto } from './dto/update-admin.dto';

/**
 * Team & Permissions (guide §2) — REFERENCE IMPLEMENTATION for a module:
 * DTO-validated input → Prisma transaction → audit entry in the same transaction.
 */

const EMAIL_IN_USE = 'An account already uses that email.';

@Injectable()
export class AdminsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list() {
    const admins = await this.prisma.adminUser.findMany({ orderBy: [{ role: 'asc' }, { name: 'asc' }] });
    return { admins: admins.map(toSessionAdmin) };
  }

  /** Emails are unique ignoring case (prototype: "An account already uses that email."). */
  private async assertEmailFree(email: string, excludeId?: string) {
    const taken = await this.prisma.adminUser.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
    if (taken) throw new ConflictException(EMAIL_IN_USE);
  }

  /** Two saves racing past assertEmailFree still hit the unique index — give them the same message. */
  private async withEmailConflict<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictException(EMAIL_IN_USE);
      throw e;
    }
  }

  async create(actor: SessionAdmin, { password, ...input }: CreateAdminDto) {
    await this.assertEmailFree(input.email);
    const admin = await this.withEmailConflict(() => this.prisma.$transaction(async (tx) => {
      const created = await tx.adminUser.create({
        data: { ...input, role: 'SUB_ADMIN', passwordHash: await bcrypt.hash(password, 10) },
      });
      await this.audit.write(
        actor,
        { action: `Created Sub Admin account: ${created.name}`, section: 'team', entityType: 'AdminUser', entityId: created.id, after: toSessionAdmin(created) },
        tx,
      );
      return created;
    }));
    return { admin: toSessionAdmin(admin) };
  }

  async update(actor: SessionAdmin, id: string, input: UpdateAdminDto) {
    const existing = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException();
    // Explicit, not just a side effect of the Super Admin rule below: deactivating or editing your
    // own account here could lock you out.
    if (existing.id === actor.id) throw new BadRequestException("You can't change your own account here.");
    if (existing.role === 'SUPER_ADMIN') throw new BadRequestException('Super Admin permissions cannot be edited here.');
    if (input.email) await this.assertEmailFree(input.email, id);

    const admin = await this.withEmailConflict(() => this.prisma.$transaction(async (tx) => {
      const updated = await tx.adminUser.update({ where: { id }, data: input });
      await this.audit.write(
        actor,
        {
          action: `Updated Sub Admin account and permissions: ${updated.name}`,
          section: 'team',
          entityType: 'AdminUser',
          entityId: updated.id,
          before: toSessionAdmin(existing),
          after: toSessionAdmin(updated),
        },
        tx,
      );
      return updated;
    }));
    return { admin: toSessionAdmin(admin) };
  }
}
