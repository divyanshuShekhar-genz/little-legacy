import { Module } from '@nestjs/common';
import { ActivityReviewsController } from './activity-reviews.controller';
import { ActivityReviewsService } from './activity-reviews.service';

@Module({
  controllers: [ActivityReviewsController],
  providers: [ActivityReviewsService],
})
export class ActivityReviewsModule {}
