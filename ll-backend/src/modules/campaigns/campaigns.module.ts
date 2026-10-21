import { Module } from '@nestjs/common';
import { CampaignsController, NotificationsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';

@Module({
  controllers: [CampaignsController, NotificationsController],
  providers: [CampaignsService],
})
export class CampaignsModule {}
