import { Module } from '@nestjs/common';
import { AgeGroupsController } from './age-groups.controller';
import { AgeGroupsService } from './age-groups.service';

@Module({
  controllers: [AgeGroupsController],
  providers: [AgeGroupsService],
})
export class AgeGroupsModule {}
