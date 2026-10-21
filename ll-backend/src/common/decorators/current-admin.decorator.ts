import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { SessionAdmin } from '../types/session-admin';

/** The signed-in admin (`req.user`). Use on routes behind JwtAuthGuard. */
export const CurrentAdmin = createParamDecorator((_data: unknown, ctx: ExecutionContext): SessionAdmin => {
  const admin = ctx.switchToHttp().getRequest<{ user?: SessionAdmin }>().user;
  if (!admin) throw new UnauthorizedException();
  return admin;
});
