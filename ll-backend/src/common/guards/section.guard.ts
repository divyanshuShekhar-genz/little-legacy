import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SECTION_KEY } from '../decorators/section.decorator';
import { isSuperAdmin, type SessionAdmin } from '../types/session-admin';

/**
 * Server-side section gate — the real enforcement (the UI only hides sections).
 * Use after JwtAuthGuard: `@UseGuards(JwtAuthGuard, SectionGuard)` + `@RequireSection('users')`.
 * Controllers without @RequireSection allow any signed-in admin.
 */
@Injectable()
export class SectionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const section = this.reflector.getAllAndOverride<string | undefined>(SECTION_KEY, [context.getHandler(), context.getClass()]);
    const admin = context.switchToHttp().getRequest<{ user?: SessionAdmin }>().user;
    if (!admin) throw new UnauthorizedException();
    if (!section || isSuperAdmin(admin)) return true;
    if (section !== 'superAdmin' && admin.permissions.includes(section)) return true;
    throw new ForbiddenException('You do not have access to this section');
  }
}
