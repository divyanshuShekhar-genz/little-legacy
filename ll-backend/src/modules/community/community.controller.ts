import { Body, Controller, Get, HttpCode, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { SectionGuard } from '../../common/guards/section.guard';
import { RequireSection } from '../../common/decorators/section.decorator';
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator';
import type { SessionAdmin } from '../../common/types/session-admin';
import { CommunityService } from './community.service';
import { DecisionDto, TeamPostDto } from './dto/decision.dto';
import { VisibleLimitDto } from './dto/visible-limit.dto';

@Controller('community')
@UseGuards(JwtAuthGuard, SectionGuard)
@RequireSection('community')
export class CommunityController {
  constructor(private readonly community: CommunityService) {}

  @Get()
  list() {
    return this.community.list();
  }

  /** Approve (optionally rephrased), reject with a reason, or save in draft. Notifies the parent. */
  @Post('posts/:id/review')
  @HttpCode(200)
  review(@CurrentAdmin() admin: SessionAdmin, @Param('id') id: string, @Body() dto: DecisionDto) {
    return this.community.review(admin, id, dto);
  }

  @Post('team-posts')
  createTeamPost(@CurrentAdmin() admin: SessionAdmin, @Body() dto: TeamPostDto) {
    return this.community.saveTeamPost(admin, null, dto);
  }

  @Patch('team-posts/:id')
  updateTeamPost(@CurrentAdmin() admin: SessionAdmin, @Param('id') id: string, @Body() dto: TeamPostDto) {
    return this.community.saveTeamPost(admin, id, dto);
  }

  @Put('settings')
  saveVisibleLimit(@CurrentAdmin() admin: SessionAdmin, @Body() dto: VisibleLimitDto) {
    return this.community.saveVisibleLimit(admin, dto);
  }
}
