"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = require("zod");
const schema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'test', 'production']).default('development'),
    PORT: zod_1.z.coerce.number().default(4000),
    DATABASE_URL: zod_1.z.string().min(1),
    JWT_SECRET: zod_1.z.string().min(8),
    JWT_EXPIRES_IN: zod_1.z.string().default('12h'),
    JWT_REMEMBER_EXPIRES_IN: zod_1.z.string().default('7d'),
    CORS_ORIGIN: zod_1.z.string().default('http://localhost:5173'),
    STORAGE_DRIVER: zod_1.z.enum(['local']).default('local'),
    UPLOAD_DIR: zod_1.z.string().default('uploads'),
    UPLOAD_PUBLIC_PATH: zod_1.z.string().default('/uploads'),
    PARENT_JWT_SECRET: zod_1.z.string().min(16).optional(),
    PARENT_ACCESS_EXPIRES_IN: zod_1.z.string().default('1h'),
    PARENT_REFRESH_DAYS: zod_1.z.coerce.number().int().positive().default(60),
    GOOGLE_CLIENT_IDS: zod_1.z.string().default(''),
    APPLE_CLIENT_IDS: zod_1.z.string().default(''),
    EMAIL_DRIVER: zod_1.z.enum(['log']).default('log'),
});
const parsed = schema.parse(process.env);
if (parsed.NODE_ENV === 'production' && !parsed.PARENT_JWT_SECRET) {
    throw new Error('PARENT_JWT_SECRET is required in production.');
}
const list = (v) => v.split(',').map((s) => s.trim()).filter(Boolean);
exports.env = {
    ...parsed,
    PARENT_JWT_SECRET: parsed.PARENT_JWT_SECRET ?? `${parsed.JWT_SECRET}:parent-app`,
    GOOGLE_CLIENT_IDS: list(parsed.GOOGLE_CLIENT_IDS),
    APPLE_CLIENT_IDS: list(parsed.APPLE_CLIENT_IDS),
};
//# sourceMappingURL=env.js.map