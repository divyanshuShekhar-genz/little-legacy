import { Body, Controller, Get, Param, Patch, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { SectionGuard } from '../../common/guards/section.guard';
import { RequireSection } from '../../common/decorators/section.decorator';
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator';
import type { SessionAdmin } from '../../common/types/session-admin';
import { PlansService } from './plans.service';
import { CountryPricesDto, UpdatePlanDto } from './dto/plan.dto';

/** Plans (API_REQUESTS #20). Reading: Subscriptions or Memories (checked in the service). Changing: Subscriptions. */
@Controller('plans')
@UseGuards(JwtAuthGuard, SectionGuard)
export class PlansController {
  constructor(private readonly plans: PlansService) {}

  @Get()
  list(@CurrentAdmin() admin: SessionAdmin) {
    return this.plans.list(admin);
  }

  @Patch(':tier')
  @RequireSection('subscriptions')
  update(@CurrentAdmin() admin: SessionAdmin, @Param('tier') tier: string, @Body() dto: UpdatePlanDto) {
    return this.plans.update(admin, tier, dto);
  }
}

/** "Edit prices · {country}" (API_REQUESTS #20). Each group's permission is checked in the service. */
@Controller('countries')
@UseGuards(JwtAuthGuard, SectionGuard)
export class CountryPricesController {
  constructor(private readonly plans: PlansService) {}

  @Put(':code/prices')
  save(@CurrentAdmin() admin: SessionAdmin, @Param('code') code: string, @Body() dto: CountryPricesDto) {
    return this.plans.countryPrices(admin, code, dto);
  }
}
