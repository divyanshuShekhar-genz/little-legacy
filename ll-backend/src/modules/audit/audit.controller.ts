import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { SectionGuard } from '../../common/guards/section.guard';
import { RequireSection } from '../../common/decorators/section.decorator';
import { AuditService } from './audit.service';
import { ListAuditQueryDto } from './dto/list-audit.query.dto';

/** Audit History (guide §23). Super Admin only, read only. */
@Controller('audit')
@UseGuards(JwtAuthGuard, SectionGuard)
@RequireSection('superAdmin')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@Query() query: ListAuditQueryDto) {
    return this.audit.list(query.take, query.cursor);
  }
}
