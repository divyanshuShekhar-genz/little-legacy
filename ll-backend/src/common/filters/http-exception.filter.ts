import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

/**
 * Every error response has one shape: `{ error: { message, details? } }` — the frontend's
 * `errorMessage()` reads `error.message`. Registered globally in main.ts.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const send = (status: number, message: string, details?: unknown) =>
      res.status(status).json({ error: details === undefined ? { message } : { message, details } });

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const raw = typeof body === 'string' ? body : (body as { message?: unknown }).message;
      // ValidationPipe returns every failed constraint; show the first, keep the rest as details.
      const messages = Array.isArray(raw) ? raw.map(String) : [String(raw ?? exception.message)];
      let message = messages[0] ?? 'Request failed';
      if (status === HttpStatus.UNAUTHORIZED && message === 'Unauthorized') message = 'Sign in to continue';
      if (status === HttpStatus.NOT_FOUND && message.startsWith('Cannot ')) message = 'Not found';
      if (status === HttpStatus.PAYLOAD_TOO_LARGE) message = 'File is too large.';
      return send(status, message, messages.length > 1 ? messages : undefined);
    }
    if (exception instanceof Prisma.PrismaClientKnownRequestError && exception.code === 'P2002') {
      return send(HttpStatus.CONFLICT, 'A record with that value already exists');
    }
    if (exception instanceof Prisma.PrismaClientInitializationError) {
      this.logger.error(`Database unavailable: ${exception.message}`);
      return send(HttpStatus.SERVICE_UNAVAILABLE, 'Database unavailable — check DATABASE_URL and that Postgres is running');
    }
    this.logger.error(exception instanceof Error ? (exception.stack ?? exception.message) : String(exception));
    return send(HttpStatus.INTERNAL_SERVER_ERROR, 'Internal server error');
  }
}
