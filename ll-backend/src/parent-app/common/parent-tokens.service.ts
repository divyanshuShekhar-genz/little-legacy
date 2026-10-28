import { createHash, randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Prisma } from '@prisma/client';
import { env } from '../../common/config/env';
import { PrismaService } from '../../prisma/prisma.service';
import type { ParentAccessClaims } from './session-parent';

type Db = Prisma.TransactionClient;

export const SESSION_ENDED = 'Your session has ended. Please sign in again.';
const DAY = 24 * 60 * 60_000;

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export interface TokenPair {
  accessToken: string;
  /** `{sessionId}.{secret}`. Store it securely on the device; it changes on every refresh. */
  refreshToken: string;
  /** Seconds until the access token expires. */
  expiresIn: number;
}

/**
 * Parent sessions (decision 1, 2026-10-28): a 1-hour access token (JWT) and a 60-day refresh
 * token per device. Only the refresh secret's hash is stored, it's replaced on every refresh, and
 * the 60 days restart then. Presenting an old refresh token again ends that session (it may have
 * been copied), so the app must not refresh twice at once.
 */
@Injectable()
export class ParentTokensService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /** A new device session for the parent. */
  async start(parentId: string, db: Db = this.prisma): Promise<TokenPair> {
    const secret = randomBytes(32).toString('base64url');
    const session = await db.parentSession.create({
      data: { parentId, tokenHash: sha256(secret), expiresAt: new Date(Date.now() + env.PARENT_REFRESH_DAYS * DAY) },
    });
    return this.pair(parentId, session.id, secret);
  }

  /** Swap a refresh token for a new pair. 401 SESSION_ENDED when it's expired, revoked or reused. */
  async refresh(refreshToken: string): Promise<TokenPair> {
    const [sessionId, secret] = refreshToken.split('.');
    if (!sessionId || !secret) throw new UnauthorizedException(SESSION_ENDED);
    const now = new Date();
    const next = randomBytes(32).toString('base64url');
    const rotated = await this.prisma.parentSession.updateMany({
      where: { id: sessionId, tokenHash: sha256(secret), revokedAt: null, expiresAt: { gt: now }, parent: { deletedAt: null } },
      data: { tokenHash: sha256(next), lastUsedAt: now, expiresAt: new Date(now.getTime() + env.PARENT_REFRESH_DAYS * DAY) },
    });
    if (rotated.count !== 1) {
      // A wrong secret for a live session means an old token was replayed: end the session.
      await this.prisma.parentSession.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: now } });
      throw new UnauthorizedException(SESSION_ENDED);
    }
    const { parentId } = await this.prisma.parentSession.findUniqueOrThrow({ where: { id: sessionId }, select: { parentId: true } });
    return this.pair(parentId, sessionId, next);
  }

  /** End one session (sign out). */
  revoke(sessionId: string, db: Db = this.prisma) {
    return db.parentSession.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  /** End every session of the parent, except `keepSessionId` (password change keeps this device). */
  revokeAll(parentId: string, keepSessionId?: string, db: Db = this.prisma) {
    return db.parentSession.updateMany({
      where: { parentId, revokedAt: null, ...(keepSessionId ? { id: { not: keepSessionId } } : {}) },
      data: { revokedAt: new Date() },
    });
  }

  private async pair(parentId: string, sessionId: string, secret: string): Promise<TokenPair> {
    const claims: ParentAccessClaims = { sub: parentId, sid: sessionId, typ: 'parent' };
    // The expiry type is a template literal ("1h"); env values are validated strings.
    const accessToken = await this.jwt.signAsync(claims, { secret: env.PARENT_JWT_SECRET, expiresIn: env.PARENT_ACCESS_EXPIRES_IN as unknown as number });
    const { exp, iat } = this.jwt.decode<{ exp: number; iat: number }>(accessToken);
    return { accessToken, refreshToken: `${sessionId}.${secret}`, expiresIn: exp - iat };
  }
}
