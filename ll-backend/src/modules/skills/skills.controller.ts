import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { SectionGuard } from '../../common/guards/section.guard';
import { RequireSection } from '../../common/decorators/section.decorator';
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator';
import type { SessionAdmin } from '../../common/types/session-admin';
import { SkillsService } from './skills.service';
import { SelectionPreviewService } from './selection-preview.service';
import { CreateSkillDto, SelectionPreviewDto, SkillQueryDto, UpdateSkillDto } from './dto/skill.dto';

/** Skills. Reading: any signed-in admin. Changes and the preview: Skill Personalisation. */
@Controller('skills')
@UseGuards(JwtAuthGuard, SectionGuard)
export class SkillsController {
  constructor(
    private readonly skills: SkillsService,
    private readonly selection: SelectionPreviewService,
  ) {}

  @Get()
  list(@Query() query: SkillQueryDto) {
    return this.skills.list(query);
  }

  @Post()
  @RequireSection('skillPersonalisation')
  create(@CurrentAdmin() admin: SessionAdmin, @Body() dto: CreateSkillDto) {
    return this.skills.create(admin, dto);
  }

  @Patch(':id')
  @RequireSection('skillPersonalisation')
  update(@CurrentAdmin() admin: SessionAdmin, @Param('id') id: string, @Body() dto: UpdateSkillDto) {
    return this.skills.update(admin, id, dto);
  }

  /** "Preview child selection": read only; saves nothing. */
  @Post('preview')
  @HttpCode(200)
  @RequireSection('skillPersonalisation')
  preview(@Body() dto: SelectionPreviewDto) {
    return this.selection.preview(dto);
  }
}
