import { Body, Controller, Delete, Get, Header, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { SectionGuard } from '../../common/guards/section.guard';
import { RequireSection } from '../../common/decorators/section.decorator';
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator';
import type { SessionAdmin } from '../../common/types/session-admin';
import { RegionsService } from './regions.service';
import { RegionalExportService } from './regional-export.service';
import { CreateRegionDto, DeleteRegionDto, RegionExportQueryDto, UpdateRegionDto } from './dto/region.dto';

/** Regional learning categories. Reading: any signed-in admin. Changes: Super Admin only. */
@Controller('regions')
@UseGuards(JwtAuthGuard, SectionGuard)
export class RegionsController {
  constructor(
    private readonly regions: RegionsService,
    private readonly regionalExport: RegionalExportService,
  ) {}

  @Get()
  list() {
    return this.regions.list();
  }

  /** "Export regional learning" (API_REQUESTS #10): every category's setup, or one with `?regionId=`. */
  @Get('export')
  @RequireSection('superAdmin')
  @Header('Content-Disposition', 'attachment; filename="little-legacy-regional-learning.json"')
  export(@CurrentAdmin() admin: SessionAdmin, @Query() query: RegionExportQueryDto) {
    return this.regionalExport.export(admin, query.regionId);
  }

  @Post()
  @RequireSection('superAdmin')
  create(@CurrentAdmin() admin: SessionAdmin, @Body() dto: CreateRegionDto) {
    return this.regions.create(admin, dto);
  }

  @Patch(':id')
  @RequireSection('superAdmin')
  update(@CurrentAdmin() admin: SessionAdmin, @Param('id') id: string, @Body() dto: UpdateRegionDto) {
    return this.regions.update(admin, id, dto);
  }

  @Delete(':id')
  @RequireSection('superAdmin')
  remove(@CurrentAdmin() admin: SessionAdmin, @Param('id') id: string, @Body() dto: DeleteRegionDto) {
    return this.regions.remove(admin, id, dto);
  }
}
