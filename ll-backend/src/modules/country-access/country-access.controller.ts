import { Body, Controller, Delete, Get, Header, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator';
import { RESTRICTION_TYPE_KEYS, type RestrictionType } from '../../common/rules';
import type { SessionAdmin } from '../../common/types/session-admin';
import { CountryAccessService } from './country-access.service';
import { DeleteRestrictionDto, RestrictionDto } from './dto/restriction.dto';

/**
 * Country access rules. No @RequireSection: each rule type belongs to a section
 * (RESTRICTION_TYPES[type].section), and the service checks the admin holds it — so Community
 * staff manage Community rules, Stories staff manage Stories rules, and so on.
 */
@Controller('country-access')
@UseGuards(JwtAuthGuard)
export class CountryAccessController {
  constructor(private readonly countryAccess: CountryAccessService) {}

  /** `?types=COMMUNITY` (comma-separated) limits the list to the calling page's types. */
  @Get()
  list(@CurrentAdmin() admin: SessionAdmin, @Query('types') types?: string) {
    const requested = (types ?? '').split(',').filter((t): t is RestrictionType => (RESTRICTION_TYPE_KEYS as string[]).includes(t));
    return this.countryAccess.list(admin, requested);
  }

  @Get('preview')
  preview(@Query('country') country?: string) {
    return this.countryAccess.preview(country ? country.toUpperCase() : null);
  }

  @Get('export')
  @Header('Content-Disposition', 'attachment; filename="little-legacy-country-access.json"')
  exportRules(@CurrentAdmin() admin: SessionAdmin) {
    return this.countryAccess.exportRules(admin);
  }

  @Post()
  create(@CurrentAdmin() admin: SessionAdmin, @Body() dto: RestrictionDto) {
    return this.countryAccess.create(admin, dto);
  }

  @Patch(':id')
  update(@CurrentAdmin() admin: SessionAdmin, @Param('id') id: string, @Body() dto: RestrictionDto) {
    return this.countryAccess.update(admin, id, dto);
  }

  @Delete(':id')
  remove(@CurrentAdmin() admin: SessionAdmin, @Param('id') id: string, @Body() dto: DeleteRestrictionDto) {
    return this.countryAccess.remove(admin, id, dto);
  }
}
