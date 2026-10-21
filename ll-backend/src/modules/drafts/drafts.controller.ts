import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { SectionGuard } from '../../common/guards/section.guard';
import { RequireSection } from '../../common/decorators/section.decorator';
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator';
import type { SessionAdmin } from '../../common/types/session-admin';
import { DraftsService } from './drafts.service';
import { RejectDraftDto } from './dto/reject-draft.dto';

/** Draft approvals (guide §2). Listing is open to any admin; deciding is Super Admin only. */
@Controller('drafts')
@UseGuards(JwtAuthGuard, SectionGuard)
export class DraftsController {
  constructor(private readonly drafts: DraftsService) {}

  @Get()
  list(@CurrentAdmin() admin: SessionAdmin) {
    return this.drafts.list(admin);
  }

  @Post(':id/approve')
  @HttpCode(200)
  @RequireSection('superAdmin')
  approve(@CurrentAdmin() admin: SessionAdmin, @Param('id') id: string) {
    return this.drafts.approve(admin, id);
  }

  @Post(':id/reject')
  @HttpCode(204)
  @RequireSection('superAdmin')
  async reject(@CurrentAdmin() admin: SessionAdmin, @Param('id') id: string, @Body() dto: RejectDraftDto) {
    await this.drafts.reject(admin, id, dto.reason);
  }
}
