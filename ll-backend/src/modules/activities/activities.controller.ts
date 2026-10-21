import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { SectionGuard } from '../../common/guards/section.guard';
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator';
import type { SessionAdmin } from '../../common/types/session-admin';
import { ActivitiesService } from './activities.service';
import { ActivityDto, ActivityQueryDto, DeleteActivityDto } from './dto/activity.dto';

/**
 * Activities. No @RequireSection: any signed-in admin can read. Changes need `activities` or
 * `developmentalMilestones`, checked in ActivitiesService.
 */
@Controller('activities')
@UseGuards(JwtAuthGuard, SectionGuard)
export class ActivitiesController {
  constructor(private readonly activities: ActivitiesService) {}

  @Get()
  list(@Query() query: ActivityQueryDto) {
    return this.activities.list(query);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.activities.get(id);
  }

  @Post()
  create(@CurrentAdmin() admin: SessionAdmin, @Body() dto: ActivityDto) {
    return this.activities.create(admin, dto);
  }

  @Patch(':id')
  update(@CurrentAdmin() admin: SessionAdmin, @Param('id') id: string, @Body() dto: ActivityDto) {
    return this.activities.update(admin, id, dto);
  }

  @Delete(':id')
  remove(@CurrentAdmin() admin: SessionAdmin, @Param('id') id: string, @Body() dto: DeleteActivityDto) {
    return this.activities.remove(admin, id, dto);
  }
}
