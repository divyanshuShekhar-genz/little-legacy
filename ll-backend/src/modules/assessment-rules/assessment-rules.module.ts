import { Module } from '@nestjs/common';
import { AssessmentRulesController } from './assessment-rules.controller';
import { AssessmentRulesService } from './assessment-rules.service';

@Module({
  controllers: [AssessmentRulesController],
  providers: [AssessmentRulesService],
})
export class AssessmentRulesModule {}
