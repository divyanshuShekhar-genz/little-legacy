import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { SectionGuard } from '../../common/guards/section.guard';
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator';
import type { SessionAdmin } from '../../common/types/session-admin';
import { LevelsService } from './levels.service';
import { CreateLevelDto, DeleteLevelDto, LevelQueryDto, UpdateLevelDto } from './dto/level.dto';

/**
 * Area levels. No @RequireSection: any signed-in admin can read. Changes need
 * `developmentalMilestones` or `questionnairesLevels`, checked in LevelsService.
 */
@Controller('levels')
@UseGuards(JwtAuthGuard, SectionGuard)
export class LevelsController {
  constructor(private readonly levels: LevelsService) {}

  @Get()
  list(@Query() query: LevelQueryDto) {
    return this.levels.list(query);
  }

  @Post()
  create(@CurrentAdmin() admin: SessionAdmin, @Body() dto: CreateLevelDto) {
    return this.levels.create(admin, dto);
  }

  @Patch(':id')
  update(@CurrentAdmin() admin: SessionAdmin, @Param('id') id: string, @Body() dto: UpdateLevelDto) {
    return this.levels.update(admin, id, dto);
  }

  @Delete(':id')
  remove(@CurrentAdmin() admin: SessionAdmin, @Param('id') id: string, @Body() dto: DeleteLevelDto) {
    return this.levels.remove(admin, id, dto);
  }
}
