import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { SessionParent } from './session-parent';

/** The signed-in parent (`req.parent`). Use on routes behind ParentAuthGuard. */
export const CurrentParent = createParamDecorator((_data: unknown, ctx: ExecutionContext): SessionParent => {
  const parent = ctx.switchToHttp().getRequest<{ parent?: SessionParent }>().parent;
  if (!parent) throw new UnauthorizedException();
  return parent;
});
