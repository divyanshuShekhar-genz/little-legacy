import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { SectionGuard } from '../../common/guards/section.guard';
import { RequireSection } from '../../common/decorators/section.decorator';
import { ActivityReviewsService } from './activity-reviews.service';
import { ListActivityReviewsQueryDto } from './dto/list-activity-reviews.query.dto';

/** Activity Reviews — read only. */
@Controller('activity-reviews')
@UseGuards(JwtAuthGuard, SectionGuard)
@RequireSection('activityReviews')
export class ActivityReviewsController {
  constructor(private readonly reviews: ActivityReviewsService) {}

  @Get()
  list(@Query() query: ListActivityReviewsQueryDto) {
    return this.reviews.list(query);
  }
}
