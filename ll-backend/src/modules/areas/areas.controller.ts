import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { SectionGuard } from '../../common/guards/section.guard';
import { RequireSection } from '../../common/decorators/section.decorator';
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator';
import type { SessionAdmin } from '../../common/types/session-admin';
import { AreasService } from './areas.service';
import { CreateAreaDto, DeleteAreaDto, RegionQueryDto, UpdateAreaDto } from './dto/area.dto';

/** Development areas. Reading: any signed-in admin. Changes: Developmental Milestones. */
@Controller('areas')
@UseGuards(JwtAuthGuard, SectionGuard)
export class AreasController {
  constructor(private readonly areas: AreasService) {}

  @Get()
  list(@Query() query: RegionQueryDto) {
    return this.areas.list(query.regionId);
  }

  @Post()
  @RequireSection('developmentalMilestones')
  create(@CurrentAdmin() admin: SessionAdmin, @Body() dto: CreateAreaDto) {
    return this.areas.create(admin, dto);
  }

  @Patch(':id')
  @RequireSection('developmentalMilestones')
  update(@CurrentAdmin() admin: SessionAdmin, @Param('id') id: string, @Body() dto: UpdateAreaDto) {
    return this.areas.update(admin, id, dto);
  }

  @Delete(':id')
  @RequireSection('developmentalMilestones')
  remove(@CurrentAdmin() admin: SessionAdmin, @Param('id') id: string, @Body() dto: DeleteAreaDto) {
    return this.areas.remove(admin, id, dto);
  }
}
