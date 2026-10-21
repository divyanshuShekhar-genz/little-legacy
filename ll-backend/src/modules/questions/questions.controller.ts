import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { SectionGuard } from '../../common/guards/section.guard';
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator';
import type { SessionAdmin } from '../../common/types/session-admin';
import { QuestionsService } from './questions.service';
import { RequireSection } from '../../common/decorators/section.decorator';
import { CreateQuestionDto, DeleteQuestionDto, QuestionQueryDto, SkillMapDto, UpdateQuestionDto } from './dto/question.dto';

/**
 * Questionnaire questions — ADMIN API (marks and difficulty are admin-only). No @RequireSection:
 * any signed-in admin can read. Changes need `questionnairesLevels` or `developmentalMilestones`.
 */
@Controller('questions')
@UseGuards(JwtAuthGuard, SectionGuard)
export class QuestionsController {
  constructor(private readonly questions: QuestionsService) {}

  @Get()
  list(@Query() query: QuestionQueryDto) {
    return this.questions.list(query);
  }

  @Post()
  create(@CurrentAdmin() admin: SessionAdmin, @Body() dto: CreateQuestionDto) {
    return this.questions.create(admin, dto);
  }

  @Patch(':id')
  update(@CurrentAdmin() admin: SessionAdmin, @Param('id') id: string, @Body() dto: UpdateQuestionDto) {
    return this.questions.update(admin, id, dto);
  }

  /** "Map answers" (Skill Personalisation). */
  @Put(':id/skill-map')
  @RequireSection('skillPersonalisation')
  saveSkillMap(@CurrentAdmin() admin: SessionAdmin, @Param('id') id: string, @Body() dto: SkillMapDto) {
    return this.questions.saveSkillMap(admin, id, dto);
  }

  @Delete(':id')
  remove(@CurrentAdmin() admin: SessionAdmin, @Param('id') id: string, @Body() dto: DeleteQuestionDto) {
    return this.questions.remove(admin, id, dto);
  }
}
