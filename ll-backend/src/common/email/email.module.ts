import { Global, Module } from '@nestjs/common';
import { env } from '../config/env';
import { EMAIL } from './email.interface';
import { LogEmailService } from './log-email.service';

/** Picks the email driver from EMAIL_DRIVER. Add provider drivers (SES etc.) here. */
@Global()
@Module({
  providers: [
    {
      provide: EMAIL,
      useClass: { log: LogEmailService }[env.EMAIL_DRIVER],
    },
  ],
  exports: [EMAIL],
})
export class EmailModule {}
