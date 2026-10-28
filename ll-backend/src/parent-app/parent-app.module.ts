import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AccountController } from './account/account.controller';
import { AccountService } from './account/account.service';
import { AppAuthController } from './auth/app-auth.controller';
import { AppAuthService } from './auth/app-auth.service';
import { SocialVerifierService } from './auth/social-verifier.service';
import { AppChildrenController } from './children/app-children.controller';
import { AppChildrenService } from './children/app-children.service';
import { ParentAuthGuard } from './common/parent-auth.guard';
import { ParentTokensService } from './common/parent-tokens.service';
import { AppOptionsController } from './options/app-options.controller';

/**
 * The parent mobile app's API, under /api/app (docs/PARENT_API.md). Kept apart from the admin
 * modules: its own tokens (PARENT_JWT_SECRET, passed per call), guard and response shapes.
 * The sign-in rate limit comes from AuthModule's ThrottlerModule (global).
 */
@Module({
  imports: [JwtModule.register({})],
  controllers: [AppOptionsController, AppAuthController, AccountController, AppChildrenController],
  providers: [ParentTokensService, ParentAuthGuard, SocialVerifierService, AppAuthService, AccountService, AppChildrenService],
})
export class ParentAppModule {}
