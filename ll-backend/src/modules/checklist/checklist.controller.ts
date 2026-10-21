import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { SectionGuard } from '../../common/guards/section.guard';
import { RequireSection } from '../../common/decorators/section.decorator';
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator';
import type { SessionAdmin } from '../../common/types/session-admin';
import { ChecklistService } from './checklist.service';
import { ChecklistItemDto, ChecklistLimitDto, ChecklistQueryDto, DeleteChecklistItemDto } from './dto/checklist.dto';

/** Parent Checklist (API_REQUESTS #25): one checklist and visible limit per regional learning category. */
@Controller('checklist-items')
@UseGuards(JwtAuthGuard, SectionGuard)
@RequireSection('parentChecklist')
export class ChecklistController {
  constructor(private readonly checklist: ChecklistService) {}

  @Get()
  list(@Query() query: ChecklistQueryDto) {
    return this.checklist.list(query.regionId);
  }

  @Put('settings')
  saveLimit(@CurrentAdmin() admin: SessionAdmin, @Body() dto: ChecklistLimitDto) {
    return this.checklist.saveLimit(admin, dto);
  }

  @Post()
  create(@CurrentAdmin() admin: SessionAdmin, @Body() dto: ChecklistItemDto) {
    return this.checklist.save(admin, null, dto);
  }

  @Patch(':id')
  update(@CurrentAdmin() admin: SessionAdmin, @Param('id') id: string, @Body() dto: ChecklistItemDto) {
    return this.checklist.save(admin, id, dto);
  }

  @Delete(':id')
  remove(@CurrentAdmin() admin: SessionAdmin, @Param('id') id: string, @Body() dto: DeleteChecklistItemDto) {
    return this.checklist.remove(admin, id, dto.mode);
  }
}
