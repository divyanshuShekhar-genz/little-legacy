import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { SectionGuard } from '../../common/guards/section.guard';
import { RequireSection } from '../../common/decorators/section.decorator';
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator';
import type { SessionAdmin } from '../../common/types/session-admin';
import { RegionQueryDto } from '../areas/dto/area.dto';
import { AgeGroupsService } from './age-groups.service';
import { CreateAgeGroupDto } from './dto/age-group.dto';

/** Age groups. Reading: any signed-in admin. Adding: Developmental Milestones. */
@Controller('age-groups')
@UseGuards(JwtAuthGuard, SectionGuard)
export class AgeGroupsController {
  constructor(private readonly ageGroups: AgeGroupsService) {}

  @Get()
  list(@Query() query: RegionQueryDto) {
    return this.ageGroups.list(query.regionId);
  }

  @Post()
  @RequireSection('developmentalMilestones')
  create(@CurrentAdmin() admin: SessionAdmin, @Body() dto: CreateAgeGroupDto) {
    return this.ageGroups.create(admin, dto);
  }
}
