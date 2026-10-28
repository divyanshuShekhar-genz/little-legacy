import { Injectable, Logger } from '@nestjs/common';
import type { EmailMessage, EmailSender } from './email.interface';

/** Development driver: writes each email to the server log instead of sending it. */
@Injectable()
export class LogEmailService implements EmailSender {
  readonly name = 'log';
  private readonly logger = new Logger('Email');

  async send({ to, subject, text }: EmailMessage) {
    this.logger.log(`To: ${to} · ${subject}\n${text}`);
  }
}
