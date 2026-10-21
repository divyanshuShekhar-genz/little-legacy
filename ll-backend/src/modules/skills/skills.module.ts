import { Module } from '@nestjs/common';
import { SkillsController } from './skills.controller';
import { SkillsService } from './skills.service';
import { SelectionPreviewService } from './selection-preview.service';

@Module({
  controllers: [SkillsController],
  providers: [SkillsService, SelectionPreviewService],
})
export class SkillsModule {}
