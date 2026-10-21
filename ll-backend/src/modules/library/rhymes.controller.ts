import { Body, Controller, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { SectionGuard } from '../../common/guards/section.guard';
import { RequireSection } from '../../common/decorators/section.decorator';
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator';
import type { SessionAdmin } from '../../common/types/session-admin';
import { LibraryService } from './library.service';
import { LibraryItemDto, RejectItemDto } from './dto/library.dto';

/** Rhymes (API_REQUESTS #18). Shares LibraryService with Stories. */
@Controller('rhymes')
@UseGuards(JwtAuthGuard, SectionGuard)
@RequireSection('rhymes')
export class RhymesController {
  constructor(private readonly library: LibraryService) {}

  @Get()
  list() {
    return this.library.list('RHYME');
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.library.get('RHYME', id);
  }

  @Post()
  create(@CurrentAdmin() admin: SessionAdmin, @Body() dto: LibraryItemDto) {
    return this.library.save(admin, 'RHYME', null, dto);
  }

  @Patch(':id')
  update(@CurrentAdmin() admin: SessionAdmin, @Param('id') id: string, @Body() dto: LibraryItemDto) {
    return this.library.save(admin, 'RHYME', id, dto);
  }

  /** The editor's Reject: Super Admin only. */
  @Post(':id/reject')
  @HttpCode(200)
  @RequireSection('superAdmin')
  reject(@CurrentAdmin() admin: SessionAdmin, @Param('id') id: string, @Body() dto: RejectItemDto) {
    return this.library.reject(admin, 'RHYME', id, dto.reason ?? null);
  }
}
