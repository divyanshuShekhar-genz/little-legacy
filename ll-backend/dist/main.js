"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
require("reflect-metadata");
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const helmet_1 = __importDefault(require("helmet"));
const env_1 = require("./common/config/env");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const local_storage_service_1 = require("./common/storage/local-storage.service");
const app_module_1 = require("./app.module");
const validationMessages = (errors) => errors.flatMap((e) => [...Object.values(e.constraints ?? {}), ...validationMessages(e.children ?? [])]);
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use((0, helmet_1.default)({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
    app.enableCors({ origin: env_1.env.CORS_ORIGIN });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, transform: true, exceptionFactory: (errors) => new common_1.BadRequestException(validationMessages(errors)) }));
    app.useGlobalFilters(new http_exception_filter_1.HttpExceptionFilter());
    if (env_1.env.STORAGE_DRIVER === 'local') {
        app.useStaticAssets(local_storage_service_1.localUploadRoot, { prefix: `${env_1.env.UPLOAD_PUBLIC_PATH}/`, index: false, maxAge: '7d', immutable: true });
    }
    await app.listen(env_1.env.PORT);
    console.log(`Little Legacy API listening on http://localhost:${env_1.env.PORT}`);
}
void bootstrap();
//# sourceMappingURL=main.js.map