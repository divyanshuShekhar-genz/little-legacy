import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { SectionGuard } from '../../common/guards/section.guard';
import { RequireSection } from '../../common/decorators/section.decorator';
import { FeedbackService } from './feedback.service';

/** Parent feedback — read only. */
@Controller('feedback')
@UseGuards(JwtAuthGuard, SectionGuard)
@RequireSection('feedback')
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Get()
  list() {
    return this.feedback.list();
  }
}
