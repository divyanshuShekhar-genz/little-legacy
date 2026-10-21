import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { env } from '../config/env';
import { PrismaService } from '../../prisma/prisma.service';
import { toSessionAdmin, type SessionAdmin } from '../types/session-admin';

/**
 * Verifies the bearer token, then loads the admin fresh from the database on every request —
 * so permission changes and deactivation apply immediately, not when the token expires.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: env.JWT_SECRET,
    });
  }

  async validate(payload: { sub: string }): Promise<SessionAdmin> {
    const admin = await this.prisma.adminUser.findUnique({ where: { id: payload.sub } });
    if (!admin || !admin.active) throw new UnauthorizedException();
    return toSessionAdmin(admin);
  }
}
