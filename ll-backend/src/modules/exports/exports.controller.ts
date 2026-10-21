import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { SectionGuard } from '../../common/guards/section.guard';
import { RequireSection } from '../../common/decorators/section.decorator';
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator';
import type { SessionAdmin } from '../../common/types/session-admin';
import { ExportsService } from './exports.service';

/** JSON downloads behind the header export buttons. Super Admin only. */
@Controller('exports')
@UseGuards(JwtAuthGuard, SectionGuard)
@RequireSection('superAdmin')
export class ExportsController {
  constructor(private readonly exports: ExportsService) {}

  @Get('parent-settings')
  @Header('Content-Disposition', 'attachment; filename="little-legacy-admin-settings.json"')
  parentSettings(@CurrentAdmin() admin: SessionAdmin) {
    return this.exports.parentSettings(admin);
  }

  @Get('assessment-settings')
  @Header('Content-Disposition', 'attachment; filename="little-legacy-assessment-settings.json"')
  assessmentSettings(@CurrentAdmin() admin: SessionAdmin) {
    return this.exports.assessmentSettings(admin);
  }
}
