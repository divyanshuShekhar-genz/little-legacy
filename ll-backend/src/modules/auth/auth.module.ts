import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { env } from '../../common/config/env';
import { JwtStrategy } from '../../common/strategies/jwt.strategy';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const FIFTEEN_MINUTES = 15 * 60_000;

/** The email being tried. The guard runs before the ValidationPipe, so normalise it here. */
const loginEmail = (req: Record<string, any>) =>
  typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({ secret: env.JWT_SECRET }),
    // Sign-in rate limit, applied only where @UseGuards(ThrottlerGuard) is used (POST /auth/login).
    // Both limits must pass. Counts every attempt, successful or not. In-memory, so per server
    // instance; behind a reverse proxy, Express needs `trust proxy` for req.ip to be the client.
    ThrottlerModule.forRoot({
      errorMessage: 'Too many sign-in attempts. Try again in a few minutes.',
      throttlers: [
        // Guessing one account's password: 5 tries per email per address.
        { name: 'loginAccount', ttl: FIFTEEN_MINUTES, limit: 5, getTracker: (req) => `${req.ip}:${loginEmail(req)}` },
        // Trying many accounts from one address. Generous, because an office may share one IP.
        { name: 'loginAddress', ttl: FIFTEEN_MINUTES, limit: 30 },
      ],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
