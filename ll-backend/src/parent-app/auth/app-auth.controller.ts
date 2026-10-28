import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CurrentParent } from '../common/current-parent.decorator';
import { ParentAuthGuard } from '../common/parent-auth.guard';
import type { SessionParent } from '../common/session-parent';
import { AppAuthService } from './app-auth.service';
import { AppLoginDto, ForgotPasswordDto, RefreshDto, RegisterDto, ResetPasswordDto, SocialLoginDto, VerifyCodeDto } from './dto/app-auth.dto';

/**
 * Parent sign-in (docs/PARENT_API.md → Auth). Public except logout. The guessable endpoints use
 * the sign-in rate limit (5 per email and address per 15 minutes; AuthModule) → 429.
 */
@Controller('app/auth')
export class AppAuthController {
  constructor(private readonly auth: AppAuthService) {}

  @Post('register')
  @UseGuards(ThrottlerGuard)
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  login(@Body() dto: AppLoginDto) {
    return this.auth.login(dto);
  }

  @Post('google')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  google(@Body() dto: SocialLoginDto) {
    return this.auth.socialLogin('google', dto);
  }

  @Post('apple')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  apple(@Body() dto: SocialLoginDto) {
    return this.auth.socialLogin('apple', dto);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(ParentAuthGuard)
  logout(@CurrentParent() parent: SessionParent) {
    return this.auth.logout(parent.sessionId);
  }

  @Post('forgot-password')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  @Post('verify-code')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  verifyCode(@Body() dto: VerifyCodeDto) {
    return this.auth.verifyCode(dto);
  }

  @Post('reset-password')
  @HttpCode(200)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }
}
