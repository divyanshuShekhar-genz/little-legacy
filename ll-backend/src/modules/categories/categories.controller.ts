import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { SectionGuard } from '../../common/guards/section.guard';
import { RequireSection } from '../../common/decorators/section.decorator';
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator';
import type { SessionAdmin } from '../../common/types/session-admin';
import { CategoriesService } from './categories.service';
import { AreaQueryDto, CreateCategoryDto, DeleteCategoryDto, UpdateCategoryDto } from './dto/category.dto';

/** Activity categories. Reading: any signed-in admin. Changes: Developmental Milestones. */
@Controller('categories')
@UseGuards(JwtAuthGuard, SectionGuard)
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  list(@Query() query: AreaQueryDto) {
    return this.categories.list(query.areaId);
  }

  @Post()
  @RequireSection('developmentalMilestones')
  create(@CurrentAdmin() admin: SessionAdmin, @Body() dto: CreateCategoryDto) {
    return this.categories.create(admin, dto);
  }

  @Patch(':id')
  @RequireSection('developmentalMilestones')
  update(@CurrentAdmin() admin: SessionAdmin, @Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categories.update(admin, id, dto);
  }

  @Delete(':id')
  @RequireSection('developmentalMilestones')
  remove(@CurrentAdmin() admin: SessionAdmin, @Param('id') id: string, @Body() dto: DeleteCategoryDto) {
    return this.categories.remove(admin, id, dto);
  }
}
