import { Body, Controller, Get, HttpCode, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { SectionGuard } from '../../common/guards/section.guard';
import { RequireSection } from '../../common/decorators/section.decorator';
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator';
import type { SessionAdmin } from '../../common/types/session-admin';
import { AssessmentRulesService } from './assessment-rules.service';
import { PreviewDto, RegionQueryDto, SaveRulesDto } from './dto/assessment-rules.dto';

/** Assessment rules — admin-sensitive (weights, formulas): `assessmentRules` for reading too. */
@Controller('assessment-rules')
@UseGuards(JwtAuthGuard, SectionGuard)
@RequireSection('assessmentRules')
export class AssessmentRulesController {
  constructor(private readonly rules: AssessmentRulesService) {}

  @Get()
  get(@Query() query: RegionQueryDto) {
    return this.rules.get(query.regionId);
  }

  /** "Calculate preview". Saves nothing. */
  @Post('preview')
  @HttpCode(200)
  preview(@Body() dto: PreviewDto) {
    return this.rules.preview(dto);
  }

  /** Approve → the next revision (or a draft). Children keep the revision they started with. */
  @Put()
  save(@CurrentAdmin() admin: SessionAdmin, @Body() dto: SaveRulesDto) {
    return this.rules.save(admin, dto);
  }
}
