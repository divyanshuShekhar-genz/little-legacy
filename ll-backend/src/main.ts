import 'dotenv/config';
import 'reflect-metadata';
import { BadRequestException, ValidationPipe, type ValidationError } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { env } from './common/config/env';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { localUploadRoot } from './common/storage/local-storage.service';
import { AppModule } from './app.module';

/**
 * Staff-facing validation messages, first failure first. Nested errors (e.g. an activity's
 * steps[0].title) come without the "steps.0." path prefix the default pipe adds.
 */
const validationMessages = (errors: ValidationError[]): string[] =>
  errors.flatMap((e) => [...Object.values(e.constraints ?? {}), ...validationMessages(e.children ?? [])]);

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Uploaded files are loaded cross-origin by the parent app and a separately hosted admin
  // panel, so Cross-Origin-Resource-Policy must allow that.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.enableCors({ origin: env.CORS_ORIGIN });

  // Every route is under /api (e.g. /api/auth/login); uploads are served at /uploads.
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, exceptionFactory: (errors) => new BadRequestException(validationMessages(errors)) }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  if (env.STORAGE_DRIVER === 'local') {
    app.useStaticAssets(localUploadRoot, { prefix: `${env.UPLOAD_PUBLIC_PATH}/`, index: false, maxAge: '7d', immutable: true });
  }

  await app.listen(env.PORT);
  console.log(`Little Legacy API listening on http://localhost:${env.PORT}`);
}

void bootstrap();
