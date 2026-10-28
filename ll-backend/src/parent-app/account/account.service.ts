import { BadRequestException, Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { checkParentDetails, currentTermsVersion, SAME_PASSWORD } from '../auth/app-auth.service';
import { ParentTokensService } from '../common/parent-tokens.service';
import { loadParentAccount } from '../common/parent-views';
import type { SessionParent } from '../common/session-parent';
import type { ChangePasswordDto, DeleteAccountDto, UpdateAccountDto } from './dto/account.dto';

export const DELETED_NAME = 'Deleted account';

/** The signed-in parent's own account: profile, password, deletion. */
@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: ParentTokensService,
  ) {}

  async get(parent: SessionParent) {
    return { parent: await loadParentAccount(this.prisma, parent.id) };
  }

  async update(parent: SessionParent, dto: UpdateAccountDto) {
    const { dob } = await checkParentDetails(this.prisma, dto);
    const current = await this.prisma.parent.findUniqueOrThrow({ where: { id: parent.id }, select: { termsAcceptedAt: true } });
    const acceptNow = dto.acceptTerms === true && !current.termsAcceptedAt;
    await this.prisma.parent.update({
      where: { id: parent.id },
      data: {
        name: dto.name,
        dob,
        phone: dto.phone,
        countryCode: dto.countryCode,
        language: dto.language,
        ...(acceptNow ? { termsAcceptedAt: new Date(), termsVersion: await currentTermsVersion(this.prisma) } : {}),
      },
    });
    return this.get(parent);
  }

  /** Change (or, for Google / Apple-only accounts, set) the password. Other devices are signed out. */
  async changePassword(parent: SessionParent, dto: ChangePasswordDto) {
    const row = await this.prisma.parent.findUniqueOrThrow({ where: { id: parent.id }, select: { passwordHash: true } });
    if (row.passwordHash) {
      if (!dto.currentPassword) throw new BadRequestException('Enter your current password.');
      if (!(await bcrypt.compare(dto.currentPassword, row.passwordHash))) throw new BadRequestException("Your current password isn't right.");
      if (await bcrypt.compare(dto.newPassword, row.passwordHash)) throw new BadRequestException(SAME_PASSWORD);
    }
    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.$transaction(async (tx) => {
      await tx.parent.update({ where: { id: parent.id }, data: { passwordHash } });
      await this.tokens.revokeAll(parent.id, parent.sessionId, tx);
    });
    return this.get(parent);
  }

  /**
   * Account deletion (decision 8; required by the app stores). Children and every learning record
   * go; notifications, favourites, reading history and reset codes go; orders stay for fulfilment
   * and accounts, and community posts and enquiries stay, all under "Deleted account". The email
   * is freed, so the address can sign up again. Every session ends.
   */
  async delete(parent: SessionParent, dto: DeleteAccountDto) {
    const row = await this.prisma.parent.findUniqueOrThrow({ where: { id: parent.id }, select: { passwordHash: true } });
    if (row.passwordHash) {
      if (!dto.password) throw new BadRequestException('Enter your password to delete your account.');
      if (!(await bcrypt.compare(dto.password, row.passwordHash))) throw new BadRequestException("That password isn't right.");
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.child.deleteMany({ where: { parentId: parent.id } });
      await tx.notification.deleteMany({ where: { parentId: parent.id } });
      await tx.favorite.deleteMany({ where: { parentId: parent.id } });
      await tx.libraryEngagement.deleteMany({ where: { parentId: parent.id } });
      await tx.passwordReset.deleteMany({ where: { parentId: parent.id } });
      await this.tokens.revokeAll(parent.id, undefined, tx);
      await tx.parent.update({
        where: { id: parent.id },
        data: {
          name: DELETED_NAME,
          email: `deleted-${parent.id}@deleted.invalid`,
          passwordHash: null,
          googleId: null,
          appleId: null,
          dob: null,
          phone: null,
          countryCode: null,
          deletedAt: new Date(),
        },
      });
    });
    return { status: 'deleted' as const };
  }
}
