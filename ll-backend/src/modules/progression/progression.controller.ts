import { Body, Controller, Get, Header, HttpCode, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { SectionGuard } from '../../common/guards/section.guard';
import { RequireSection } from '../../common/decorators/section.decorator';
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator';
import type { SessionAdmin } from '../../common/types/session-admin';
import { ProgressionService } from './progression.service';
import { ProgressionDto, RegionQueryDto, WeekPreviewDto } from './dto/progression.dto';

/** Activity Progression settings (API_REQUESTS #14). */
@Controller('progression')
@UseGuards(JwtAuthGuard, SectionGuard)
@RequireSection('activityProgression')
export class ProgressionController {
  constructor(private readonly progression: ProgressionService) {}

  @Get()
  get(@Query() query: RegionQueryDto) {
    return this.progression.get(query.regionId);
  }

  @Put()
  save(@CurrentAdmin() admin: SessionAdmin, @Query() query: RegionQueryDto, @Body() dto: ProgressionDto) {
    return this.progression.save(admin, query.regionId, dto);
  }

  /** "Preview a child's week" — a sample child; saves nothing. */
  @Post('preview')
  @HttpCode(200)
  preview(@Query() query: RegionQueryDto, @Body() dto: WeekPreviewDto) {
    return this.progression.preview(query.regionId, dto);
  }

  @Get('export')
  @Header('Content-Disposition', 'attachment; filename="little-legacy-activity-progression.json"')
  export(@CurrentAdmin() admin: SessionAdmin, @Query() query: RegionQueryDto) {
    return this.progression.export(admin, query.regionId);
  }
}
