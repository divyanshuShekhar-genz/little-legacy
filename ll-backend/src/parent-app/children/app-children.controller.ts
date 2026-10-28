import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentParent } from '../common/current-parent.decorator';
import { ParentAuthGuard } from '../common/parent-auth.guard';
import type { SessionParent } from '../common/session-parent';
import { AppChildrenService } from './app-children.service';
import { CreateChildDto, UpdateChildDto } from './dto/app-child.dto';

/** The signed-in parent's children (docs/PARENT_API.md → Children). Another family's child → 404. */
@Controller('app/children')
@UseGuards(ParentAuthGuard)
export class AppChildrenController {
  constructor(private readonly children: AppChildrenService) {}

  @Get()
  list(@CurrentParent() parent: SessionParent) {
    return this.children.list(parent);
  }

  @Post()
  create(@CurrentParent() parent: SessionParent, @Body() dto: CreateChildDto) {
    return this.children.create(parent, dto);
  }

  @Get(':id')
  get(@CurrentParent() parent: SessionParent, @Param('id') id: string) {
    return this.children.get(parent, id);
  }

  @Patch(':id')
  update(@CurrentParent() parent: SessionParent, @Param('id') id: string, @Body() dto: UpdateChildDto) {
    return this.children.update(parent, id, dto);
  }

  @Delete(':id')
  remove(@CurrentParent() parent: SessionParent, @Param('id') id: string) {
    return this.children.remove(parent, id);
  }
}
