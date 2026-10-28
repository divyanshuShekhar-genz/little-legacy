/**
 * Email drivers send messages to parents. Modules inject `EMAIL` and never call a provider SDK
 * directly, so adding SES / SendGrid (OPEN_QUESTIONS Q12) is a new class plus EMAIL_DRIVER.
 */
export const EMAIL = 'EMAIL';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface EmailSender {
  readonly name: string;
  send(message: EmailMessage): Promise<void>;
}
