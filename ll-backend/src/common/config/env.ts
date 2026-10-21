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
});

export const env = schema.parse(process.env);
