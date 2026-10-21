import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator';
import type { SessionAdmin } from '../../common/types/session-admin';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Public. `{ email, password, remember }` → `{ token, admin }`. Rate-limited (AuthModule) → 429. */
  @Post('login')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentAdmin() admin: SessionAdmin) {
    return { admin };
  }
}
