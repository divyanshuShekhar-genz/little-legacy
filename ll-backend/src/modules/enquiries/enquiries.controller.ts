import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { SectionGuard } from '../../common/guards/section.guard';
import { RequireSection } from '../../common/decorators/section.decorator';
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator';
import type { SessionAdmin } from '../../common/types/session-admin';
import { EnquiriesService } from './enquiries.service';
import { ReplyDto } from './dto/reply.dto';

@Controller('enquiries')
@UseGuards(JwtAuthGuard, SectionGuard)
@RequireSection('enquiries')
export class EnquiriesController {
  constructor(private readonly enquiries: EnquiriesService) {}

  @Get()
  list() {
    return this.enquiries.list();
  }

  /** Approve sends now (if the admin can publish); otherwise, or "Save in draft", a draft. */
  @Post(':id/reply')
  reply(@CurrentAdmin() admin: SessionAdmin, @Param('id') id: string, @Body() dto: ReplyDto) {
    return this.enquiries.reply(admin, id, dto);
  }
}
