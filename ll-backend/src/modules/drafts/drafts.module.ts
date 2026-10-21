import { Global, Module } from '@nestjs/common';
import { DraftsController } from './drafts.controller';
import { DraftsService } from './drafts.service';

/** Global: publishable modules inject DraftsService to register handlers and save changes. */
@Global()
@Module({
  controllers: [DraftsController],
  providers: [DraftsService],
  exports: [DraftsService],
})
export class DraftsModule {}
