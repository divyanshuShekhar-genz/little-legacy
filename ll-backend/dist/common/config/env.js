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
});
exports.env = schema.parse(process.env);
//# sourceMappingURL=env.js.map