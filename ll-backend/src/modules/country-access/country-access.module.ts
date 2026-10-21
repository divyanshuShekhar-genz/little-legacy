import { Module } from '@nestjs/common';
import { CountryAccessController } from './country-access.controller';
import { CountryAccessService } from './country-access.service';

@Module({
  controllers: [CountryAccessController],
  providers: [CountryAccessService],
})
export class CountryAccessModule {}
