import { Module } from '@nestjs/common';
import { ActivityGroupsController } from './activity-groups.controller';
import { ActivityGroupsService } from './activity-groups.service';

@Module({
  controllers: [ActivityGroupsController],
  providers: [ActivityGroupsService],
})
export class ActivityGroupsModule {}
