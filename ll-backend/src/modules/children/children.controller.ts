import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { SectionGuard } from '../../common/guards/section.guard';
import { RequireSection } from '../../common/decorators/section.decorator';
import { ChildrenService } from './children.service';
import { ListChildrenQueryDto } from './dto/list-children.query.dto';

/** Children & Learning — read only. No write routes exist here by design (guide §4). */
@Controller('children')
@UseGuards(JwtAuthGuard, SectionGuard)
@RequireSection('childLearning')
export class ChildrenController {
  constructor(private readonly children: ChildrenService) {}

  @Get()
  list(@Query() query: ListChildrenQueryDto) {
    return this.children.list({ search: query.search || undefined, area: query.area || undefined });
  }

  @Get(':id/learning-record')
  async learningRecord(@Param('id') id: string) {
    return { record: await this.children.learningRecord(id) };
  }
}
