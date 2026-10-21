import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { SectionGuard } from '../../common/guards/section.guard';
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator';
import type { SessionAdmin } from '../../common/types/session-admin';
import { LibraryCategoriesService } from './library-categories.service';
import { CategoryKindQueryDto, CreateLibraryCategoryDto, DeleteLibraryCategoryDto, RenameLibraryCategoryDto } from './dto/library.dto';

/**
 * Story / rhyme categories (API_REQUESTS #17). No @RequireSection: the permission depends on the
 * kind (`stories` or `rhymes`), checked in LibraryCategoriesService.
 */
@Controller('library-categories')
@UseGuards(JwtAuthGuard, SectionGuard)
export class LibraryCategoriesController {
  constructor(private readonly categories: LibraryCategoriesService) {}

  @Get()
  list(@CurrentAdmin() admin: SessionAdmin, @Query() query: CategoryKindQueryDto) {
    return this.categories.list(admin, query.kind);
  }

  @Post()
  create(@CurrentAdmin() admin: SessionAdmin, @Body() dto: CreateLibraryCategoryDto) {
    return this.categories.create(admin, dto);
  }

  @Patch(':id')
  rename(@CurrentAdmin() admin: SessionAdmin, @Param('id') id: string, @Body() dto: RenameLibraryCategoryDto) {
    return this.categories.rename(admin, id, dto);
  }

  @Delete(':id')
  remove(@CurrentAdmin() admin: SessionAdmin, @Param('id') id: string, @Body() dto: DeleteLibraryCategoryDto) {
    return this.categories.remove(admin, id, dto);
  }
}
