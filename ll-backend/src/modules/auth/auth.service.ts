import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { env } from '../../common/config/env';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { toSessionAdmin } from '../../common/types/session-admin';
import type { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
  ) {}

  async login({ email, password, remember = false }: LoginDto) {
    const admin = await this.prisma.adminUser.findUnique({ where: { email: email.toLowerCase() } });
    if (!admin || !admin.active || !(await bcrypt.compare(password, admin.passwordHash))) {
      throw new UnauthorizedException('Email or password is incorrect');
    }
    const session = toSessionAdmin(admin);
    await this.audit.write(session, { action: 'Signed in' });
    const expiresIn = remember ? env.JWT_REMEMBER_EXPIRES_IN : env.JWT_EXPIRES_IN;
    // The expiry type is a template-literal ("12h", "7d"); env values are validated strings.
    const token = await this.jwt.signAsync({ sub: admin.id }, { expiresIn: expiresIn as unknown as number });
    return { token, admin: session };
  }
}
