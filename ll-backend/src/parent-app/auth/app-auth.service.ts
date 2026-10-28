import { randomInt } from 'node:crypto';
import { BadRequestException, ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { env } from '../../common/config/env';
import { EMAIL, type EmailSender } from '../../common/email/email.interface';
import { isAdult } from '../../common/rules';
import { PrismaService } from '../../prisma/prisma.service';
import { ParentTokensService, sha256, type TokenPair } from '../common/parent-tokens.service';
import { loadParentAccount, type ParentAccountView } from '../common/parent-views';
import { parseDay, today } from '../common/fields';
import type { ResetClaims } from '../common/session-parent';
import { SocialVerifierService, type SocialProvider } from './social-verifier.service';
import type { AppLoginDto, ForgotPasswordDto, RegisterDto, ResetPasswordDto, SocialLoginDto, VerifyCodeDto } from './dto/app-auth.dto';

export type SignedIn = TokenPair & { parent: ParentAccountView };

const WRONG_LOGIN = 'Email or password is incorrect.';
const TERMS = 'Please accept the terms and conditions and privacy policy.';
const WRONG_CODE = "That code isn't right or has expired.";
const RESET_EXPIRED = 'Your reset has expired. Please start again.';
export const SAME_PASSWORD = "Choose a password you haven't used before.";

/** "Resend OTP" waits this long; a request inside it is ignored (the answer is the same). */
const RESEND_SECONDS = 30;
const CODE_MINUTES = 15;
const CODE_TRIES = 5;
const RESET_TOKEN_TTL = '10m';

/** Checks shared by sign-up and "edit profile". */
export async function checkParentDetails(prisma: PrismaService, d: { dob?: string; countryCode?: string }) {
  let dob: Date | undefined;
  if (d.dob !== undefined) {
    const parsed = parseDay(d.dob);
    if (!parsed || parsed > today()) throw new BadRequestException('Enter your date of birth.');
    if (!isAdult(parsed, today())) throw new BadRequestException('You must be 18 or over to create an account.');
    dob = parsed;
  }
  // Only countries in the sign-up list: a disabled country is switched off.
  if (d.countryCode !== undefined && !(await prisma.country.count({ where: { code: d.countryCode, enabled: true } }))) {
    throw new BadRequestException('Choose your country.');
  }
  return { dob };
}

/** The App Content version the parent sees when accepting the terms (null before the first publish). */
export async function currentTermsVersion(prisma: PrismaService) {
  return (await prisma.appContentVersion.findFirst({ orderBy: { version: 'desc' }, select: { version: true } }))?.version ?? null;
}

/** Parent sign-up, sign-in (email + password, Google, Apple), sessions and password reset. */
@Injectable()
export class AppAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: ParentTokensService,
    private readonly jwt: JwtService,
    private readonly social: SocialVerifierService,
    @Inject(EMAIL) private readonly email: EmailSender,
  ) {}

  async register(dto: RegisterDto): Promise<SignedIn> {
    if (dto.acceptTerms !== true) throw new BadRequestException(TERMS);
    const { dob } = await checkParentDetails(this.prisma, dto);
    if (await this.prisma.parent.count({ where: { email: dto.email } })) {
      throw new ConflictException('An account with this email already exists. Sign in instead.');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const termsVersion = await currentTermsVersion(this.prisma);
    return this.prisma.$transaction(async (tx) => {
      const parent = await tx.parent.create({
        data: {
          name: dto.name,
          email: dto.email,
          passwordHash,
          dob,
          phone: dto.phone,
          countryCode: dto.countryCode ?? null,
          language: dto.language ?? 'en',
          termsAcceptedAt: new Date(),
          termsVersion,
        },
      });
      return { ...(await this.tokens.start(parent.id, tx)), parent: await loadParentAccount(tx, parent.id) };
    });
  }

  async login(dto: AppLoginDto): Promise<SignedIn> {
    const parent = await this.prisma.parent.findFirst({ where: { email: dto.email, deletedAt: null } });
    // Google / Apple-only accounts have no password; "Forgot password?" lets them set one.
    if (!parent?.passwordHash || !(await bcrypt.compare(dto.password, parent.passwordHash))) throw new UnauthorizedException(WRONG_LOGIN);
    return this.signIn(parent.id);
  }

  /**
   * Google / Apple: the account with that provider id; else the account with the same verified
   * email, which gets linked; else a new account with gaps to fill (`missing`).
   */
  async socialLogin(provider: SocialProvider, dto: SocialLoginDto): Promise<SignedIn & { isNewAccount: boolean }> {
    const who = await this.social.verify(provider, dto.idToken);
    const idField = provider === 'google' ? 'googleId' : 'appleId';
    const label = provider === 'google' ? 'Google' : 'Apple';

    const known = await this.prisma.parent.findFirst({ where: { [idField]: who.subject, deletedAt: null } });
    if (known) return { ...(await this.signIn(known.id)), isNewAccount: false };

    if (!who.email) throw new BadRequestException(`We couldn't get your email address from ${label}. Please sign up with your email instead.`);
    const sameEmail = await this.prisma.parent.findFirst({ where: { email: who.email, deletedAt: null } });
    if (sameEmail) {
      if (sameEmail[idField]) throw new ConflictException(`This email is already linked to another ${label} account.`);
      await this.prisma.parent.update({ where: { id: sameEmail.id }, data: { [idField]: who.subject } });
      return { ...(await this.signIn(sameEmail.id)), isNewAccount: false };
    }

    const name = (who.name ?? dto.name ?? who.email.split('@')[0]!).slice(0, 80);
    return this.prisma.$transaction(async (tx) => {
      const parent = await tx.parent.create({ data: { name, email: who.email!, [idField]: who.subject } });
      return { ...(await this.tokens.start(parent.id, tx)), parent: await loadParentAccount(tx, parent.id), isNewAccount: true };
    });
  }

  refresh(refreshToken: string) {
    return this.tokens.refresh(refreshToken);
  }

  async logout(sessionId: string) {
    await this.tokens.revoke(sessionId);
    return { status: 'signed-out' as const };
  }

  /**
   * Sends a 6-digit code (15 minutes, 5 tries). The answer never says whether the account exists,
   * and a second request within 30 seconds sends nothing new.
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const answer = { resendAfter: RESEND_SECONDS };
    const parent = await this.prisma.parent.findFirst({ where: { email: dto.email, deletedAt: null }, select: { id: true, email: true } });
    if (!parent) return answer;
    const last = await this.prisma.passwordReset.findFirst({ where: { parentId: parent.id }, orderBy: { createdAt: 'desc' } });
    if (last && Date.now() - last.createdAt.getTime() < RESEND_SECONDS * 1000) return answer;

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.prisma.$transaction([
      // Only the newest code works.
      this.prisma.passwordReset.updateMany({ where: { parentId: parent.id, usedAt: null }, data: { usedAt: new Date() } }),
      this.prisma.passwordReset.create({ data: { parentId: parent.id, codeHash: sha256(code), expiresAt: new Date(Date.now() + CODE_MINUTES * 60_000) } }),
    ]);
    await this.email.send({
      to: parent.email,
      subject: 'Your Little Legacy code',
      text: `Your code is ${code}. It works for ${CODE_MINUTES} minutes.\n\nIf you didn't ask to reset your password, you can ignore this email.`,
    });
    return answer;
  }

  /** Right code → a 10-minute `resetToken` for "Choose a new password". */
  async verifyCode(dto: VerifyCodeDto) {
    const parent = await this.prisma.parent.findFirst({ where: { email: dto.email, deletedAt: null }, select: { id: true } });
    const reset = parent
      ? await this.prisma.passwordReset.findFirst({ where: { parentId: parent.id, usedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } })
      : null;
    if (!reset) throw new BadRequestException(WRONG_CODE);
    if (reset.attempts >= CODE_TRIES) throw new BadRequestException('Too many tries. Ask for a new code.');
    if (reset.codeHash !== sha256(dto.code)) {
      await this.prisma.passwordReset.update({ where: { id: reset.id }, data: { attempts: { increment: 1 } } });
      throw new BadRequestException(WRONG_CODE);
    }
    await this.prisma.passwordReset.update({ where: { id: reset.id }, data: { verifiedAt: new Date() } });
    const claims: ResetClaims = { sub: parent!.id, rid: reset.id, typ: 'reset' };
    return { resetToken: await this.jwt.signAsync(claims, { secret: env.PARENT_JWT_SECRET, expiresIn: RESET_TOKEN_TTL as unknown as number }) };
  }

  /** Sets the new password, ends every session and signs this device in. */
  async resetPassword(dto: ResetPasswordDto): Promise<SignedIn> {
    let claims: ResetClaims;
    try {
      claims = await this.jwt.verifyAsync<ResetClaims>(dto.resetToken, { secret: env.PARENT_JWT_SECRET });
    } catch {
      throw new BadRequestException(RESET_EXPIRED);
    }
    if (claims.typ !== 'reset') throw new BadRequestException(RESET_EXPIRED);
    const parent = await this.prisma.parent.findFirst({ where: { id: claims.sub, deletedAt: null } });
    if (!parent) throw new BadRequestException(RESET_EXPIRED);
    if (parent.passwordHash && (await bcrypt.compare(dto.password, parent.passwordHash))) throw new BadRequestException(SAME_PASSWORD);

    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.$transaction(async (tx) => {
      // Single use: only a verified, unused code of this parent.
      const used = await tx.passwordReset.updateMany({
        where: { id: claims.rid, parentId: parent.id, verifiedAt: { not: null }, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (used.count !== 1) throw new BadRequestException(RESET_EXPIRED);
      await tx.parent.update({ where: { id: parent.id }, data: { passwordHash } });
      await this.tokens.revokeAll(parent.id, undefined, tx);
      return { ...(await this.tokens.start(parent.id, tx)), parent: await loadParentAccount(tx, parent.id) };
    });
  }

  private async signIn(parentId: string): Promise<SignedIn> {
    return { ...(await this.tokens.start(parentId)), parent: await loadParentAccount(this.prisma, parentId) };
  }
}
