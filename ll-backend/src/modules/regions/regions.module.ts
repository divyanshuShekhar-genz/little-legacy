import { Module } from '@nestjs/common';
import { RegionsController } from './regions.controller';
import { RegionsService } from './regions.service';
import { RegionalExportService } from './regional-export.service';

@Module({
  controllers: [RegionsController],
  providers: [RegionsService, RegionalExportService],
})
export class RegionsModule {}
