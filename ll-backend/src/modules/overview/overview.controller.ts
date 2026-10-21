import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { SectionGuard } from '../../common/guards/section.guard';
import { RequireSection } from '../../common/decorators/section.decorator';
import { OverviewService } from './overview.service';

@Controller('overview')
@UseGuards(JwtAuthGuard, SectionGuard)
@RequireSection('overview')
export class OverviewController {
  constructor(private readonly overview: OverviewService) {}

  @Get()
  stats() {
    return this.overview.stats();
  }
}
