import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { SectionGuard } from '../../common/guards/section.guard';
import { RequireSection } from '../../common/decorators/section.decorator';
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator';
import type { SessionAdmin } from '../../common/types/session-admin';
import { RegionQueryDto } from '../progression/dto/progression.dto';
import { ActivityGroupsService } from './activity-groups.service';
import { ActivityGroupDto, GroupModeDto, LinkActivityDto } from './dto/activity-group.dto';

/** Activity groups with their own difficulty levels (API_REQUESTS #14). */
@Controller('activity-groups')
@UseGuards(JwtAuthGuard, SectionGuard)
@RequireSection('activityProgression')
export class ActivityGroupsController {
  constructor(private readonly groups: ActivityGroupsService) {}

  @Get()
  list(@Query() query: RegionQueryDto) {
    return this.groups.list(query.regionId);
  }

  @Post()
  create(@CurrentAdmin() admin: SessionAdmin, @Body() dto: ActivityGroupDto) {
    return this.groups.create(admin, dto);
  }

  @Patch(':id')
  update(@CurrentAdmin() admin: SessionAdmin, @Param('id') id: string, @Body() dto: ActivityGroupDto) {
    return this.groups.update(admin, id, dto);
  }

  @Post(':id/archive')
  @HttpCode(200)
  archive(@CurrentAdmin() admin: SessionAdmin, @Param('id') id: string, @Body() dto: GroupModeDto) {
    return this.groups.archive(admin, id, dto);
  }

  @Post(':id/link')
  @HttpCode(200)
  link(@CurrentAdmin() admin: SessionAdmin, @Param('id') id: string, @Body() dto: LinkActivityDto) {
    return this.groups.link(admin, id, dto);
  }
}
