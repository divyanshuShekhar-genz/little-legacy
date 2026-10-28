import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { env } from '../../common/config/env';

export type SocialProvider = 'google' | 'apple';

export interface SocialIdentity {
  provider: SocialProvider;
  /** The provider's stable user id (`sub`). */
  subject: string;
  /** Lower case; null when the provider didn't give a verified one. */
  email: string | null;
  name: string | null;
}

const PROVIDERS: Record<SocialProvider, { jwks: string; issuers: string[]; audiences: () => string[]; label: string }> = {
  google: {
    jwks: 'https://www.googleapis.com/oauth2/v3/certs',
    issuers: ['https://accounts.google.com', 'accounts.google.com'],
    audiences: () => env.GOOGLE_CLIENT_IDS,
    label: 'Google',
  },
  apple: {
    jwks: 'https://appleid.apple.com/auth/keys',
    issuers: ['https://appleid.apple.com'],
    audiences: () => env.APPLE_CLIENT_IDS,
    label: 'Apple',
  },
};

const FAILED = 'Sign-in failed. Please try again.';

/**
 * Checks a Google / Apple ID token from the app (decision 3, 2026-10-26): signed by the provider
 * (its published keys), issued for our app (client / bundle IDs from env), not expired. Nothing
 * else from the app is trusted. Off (503) until the IDs are set.
 */
@Injectable()
export class SocialVerifierService {
  private readonly keys = new Map<SocialProvider, JWTVerifyGetKey>();

  async verify(provider: SocialProvider, idToken: string): Promise<SocialIdentity> {
    const p = PROVIDERS[provider];
    const audience = p.audiences();
    if (!audience.length) throw new ServiceUnavailableException(`${p.label} sign-in isn't available yet.`);

    let keys = this.keys.get(provider);
    if (!keys) this.keys.set(provider, (keys = createRemoteJWKSet(new URL(p.jwks))));

    let claims: Record<string, unknown>;
    try {
      ({ payload: claims } = await jwtVerify(idToken, keys, { issuer: p.issuers, audience }));
    } catch {
      throw new UnauthorizedException(FAILED);
    }
    if (typeof claims.sub !== 'string' || !claims.sub) throw new UnauthorizedException(FAILED);

    // Apple sends email_verified as "true"; Google as true. Only a verified address can link accounts.
    const verified = claims.email_verified === true || claims.email_verified === 'true';
    const email = verified && typeof claims.email === 'string' ? claims.email.trim().toLowerCase() : null;
    const name = typeof claims.name === 'string' && claims.name.trim() ? claims.name.trim() : null;
    return { provider, subject: claims.sub, email, name };
  }
}
