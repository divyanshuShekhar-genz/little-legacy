import { z } from 'zod';

/**
 * Environment variables, validated once at startup — the server refuses to boot with a bad
 * config. `.env` is loaded by `import 'dotenv/config'` at the top of main.ts.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(8),
  JWT_EXPIRES_IN: z.string().default('12h'),
  /** Session length when "Remember me" is ticked. */
  JWT_REMEMBER_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  /** Where uploaded files are stored. 'local' = disk (development); cloud drivers plug in later. */
  STORAGE_DRIVER: z.enum(['local']).default('local'),
  /** Local driver: folder for uploaded files, relative to ll-backend/. */
  UPLOAD_DIR: z.string().default('uploads'),
  /** Local driver: URL path the files are served from. */
  UPLOAD_PUBLIC_PATH: z.string().default('/uploads'),

  /**
   * Parent-app tokens (docs/PARENT_API.md). A different secret from staff tokens, so neither
   * kind is accepted in place of the other. Required in production; development falls back to one
   * derived from JWT_SECRET.
   */
  PARENT_JWT_SECRET: z.string().min(16).optional(),
  PARENT_ACCESS_EXPIRES_IN: z.string().default('1h'),
  /** A parent's refresh token lasts this many days and is replaced on every refresh. */
  PARENT_REFRESH_DAYS: z.coerce.number().int().positive().default(60),
  /** Google sign-in: the OAuth client IDs of the parent app (iOS, Android, web), comma separated. Empty = off. */
  GOOGLE_CLIENT_IDS: z.string().default(''),
  /** Sign in with Apple: the app's bundle ID (and Services ID), comma separated. Empty = off. */
  APPLE_CLIENT_IDS: z.string().default(''),
  /** How emails are sent. 'log' writes them to the server log (development); a provider is added later (Q12). */
  EMAIL_DRIVER: z.enum(['log']).default('log'),
});

const parsed = schema.parse(process.env);
if (parsed.NODE_ENV === 'production' && !parsed.PARENT_JWT_SECRET) {
  throw new Error('PARENT_JWT_SECRET is required in production.');
}

const list = (v: string) => v.split(',').map((s) => s.trim()).filter(Boolean);

export const env = {
  ...parsed,
  PARENT_JWT_SECRET: parsed.PARENT_JWT_SECRET ?? `${parsed.JWT_SECRET}:parent-app`,
  GOOGLE_CLIENT_IDS: list(parsed.GOOGLE_CLIENT_IDS),
  APPLE_CLIENT_IDS: list(parsed.APPLE_CLIENT_IDS),
};
