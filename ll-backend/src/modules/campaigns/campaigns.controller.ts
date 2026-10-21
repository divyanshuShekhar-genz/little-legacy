import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { SectionGuard } from '../../common/guards/section.guard';
import { RequireSection } from '../../common/decorators/section.decorator';
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator';
import type { SessionAdmin } from '../../common/types/session-admin';
import { CampaignsService } from './campaigns.service';
import { AudienceDto, SaveCampaignDto } from './dto/campaign.dto';

/** Notification campaigns (API_REQUESTS #23). */
@Controller('campaigns')
@UseGuards(JwtAuthGuard, SectionGuard)
@RequireSection('notifications')
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Get()
  list(@CurrentAdmin() admin: SessionAdmin) {
    return this.campaigns.list(admin);
  }

  /** The matching parents for the current filters; saves nothing. */
  @Post('audience')
  @HttpCode(200)
  audience(@Body() dto: AudienceDto) {
    return this.campaigns.audience(dto);
  }

  @Post()
  save(@CurrentAdmin() admin: SessionAdmin, @Body() dto: SaveCampaignDto) {
    return this.campaigns.save(admin, dto);
  }
}

/** "Daily mandatory-activity reminders" on the Notifications page (read only). */
@Controller('notifications')
@UseGuards(JwtAuthGuard, SectionGuard)
@RequireSection('notifications')
export class NotificationsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Get('reminders')
  reminders() {
    return this.campaigns.reminders();
  }
}
