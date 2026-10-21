import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { SectionGuard } from '../../common/guards/section.guard';
import { RequireSection } from '../../common/decorators/section.decorator';
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator';
import type { SessionAdmin } from '../../common/types/session-admin';
import { AdminsService } from './admins.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

/** Team & Permissions. Super Admin only. */
@Controller('admins')
@UseGuards(JwtAuthGuard, SectionGuard)
@RequireSection('superAdmin')
export class AdminsController {
  constructor(private readonly admins: AdminsService) {}

  @Get()
  list() {
    return this.admins.list();
  }

  @Post()
  create(@CurrentAdmin() actor: SessionAdmin, @Body() dto: CreateAdminDto) {
    return this.admins.create(actor, dto);
  }

  @Patch(':id')
  update(@CurrentAdmin() actor: SessionAdmin, @Param('id') id: string, @Body() dto: UpdateAdminDto) {
    return this.admins.update(actor, id, dto);
  }
}
