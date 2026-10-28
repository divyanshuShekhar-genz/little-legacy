import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { env } from '../../common/config/env';
import { PrismaService } from '../../prisma/prisma.service';
import type { ParentAccessClaims, SessionParent } from './session-parent';

const SIGN_IN = 'Sign in to continue';

/**
 * Requires a parent access token (never a staff one: different secret and `typ`). The session is
 * checked on every request, so signing out, a password change or account deletion apply at once,
 * not when the token expires. Sets `req.parent`.
 */
@Injectable()
export class ParentAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<{ headers: Record<string, string | undefined>; parent?: SessionParent }>();
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException(SIGN_IN);

    let claims: ParentAccessClaims;
    try {
      claims = await this.jwt.verifyAsync<ParentAccessClaims>(token, { secret: env.PARENT_JWT_SECRET });
    } catch {
      throw new UnauthorizedException(SIGN_IN);
    }
    if (claims.typ !== 'parent') throw new UnauthorizedException(SIGN_IN);

    const live = await this.prisma.parentSession.count({
      where: { id: claims.sid, parentId: claims.sub, revokedAt: null, expiresAt: { gt: new Date() }, parent: { deletedAt: null } },
    });
    if (!live) throw new UnauthorizedException(SIGN_IN);
    req.parent = { id: claims.sub, sessionId: claims.sid };
    return true;
  }
}
