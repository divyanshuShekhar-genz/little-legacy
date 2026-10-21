import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { SectionGuard } from '../../common/guards/section.guard';
import { RequireSection } from '../../common/decorators/section.decorator';
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator';
import type { SessionAdmin } from '../../common/types/session-admin';
import { AppContentService } from './app-content.service';
import { CreateEntryDto, PublishDto, UpdateEntryDto } from './dto/app-content.dto';

/** App Content (API_REQUESTS #24): the working draft (direct, audited) and "Publish new version" (drafts). */
@Controller('app-content')
@UseGuards(JwtAuthGuard, SectionGuard)
@RequireSection('appContent')
export class AppContentController {
  constructor(private readonly content: AppContentService) {}

  @Get()
  get() {
    return this.content.get();
  }

  @Post('entries')
  create(@CurrentAdmin() admin: SessionAdmin, @Body() dto: CreateEntryDto) {
    return this.content.createEntry(admin, dto);
  }

  @Patch('entries/:key')
  update(@CurrentAdmin() admin: SessionAdmin, @Param('key') key: string, @Body() dto: UpdateEntryDto) {
    return this.content.updateEntry(admin, key, dto);
  }

  @Delete('entries/:key')
  remove(@CurrentAdmin() admin: SessionAdmin, @Param('key') key: string) {
    return this.content.deleteEntry(admin, key);
  }

  @Post('publish')
  @HttpCode(200)
  publish(@CurrentAdmin() admin: SessionAdmin, @Body() dto: PublishDto) {
    return this.content.publish(admin, dto.mode);
  }
}
