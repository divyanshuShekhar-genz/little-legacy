import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { SectionGuard } from '../../common/guards/section.guard';
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator';
import type { SessionAdmin } from '../../common/types/session-admin';
import { CountriesService } from './countries.service';
import { CreateCountryDto, UpdateCountryDto } from './dto/country.dto';

/**
 * No @RequireSection: any signed-in admin can read the list. Writes need `subscriptions` or
 * `shopOrders`, checked in CountriesService (one section key isn't enough).
 */
@Controller('countries')
@UseGuards(JwtAuthGuard, SectionGuard)
export class CountriesController {
  constructor(private readonly countries: CountriesService) {}

  @Get()
  list() {
    return this.countries.list();
  }

  @Post()
  create(@CurrentAdmin() admin: SessionAdmin, @Body() dto: CreateCountryDto) {
    return this.countries.create(admin, dto);
  }

  @Patch(':code')
  update(@CurrentAdmin() admin: SessionAdmin, @Param('code') code: string, @Body() dto: UpdateCountryDto) {
    return this.countries.update(admin, code, dto);
  }
}
