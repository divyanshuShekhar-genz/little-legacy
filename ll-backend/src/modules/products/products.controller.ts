import { Body, Controller, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { SectionGuard } from '../../common/guards/section.guard';
import { RequireSection } from '../../common/decorators/section.decorator';
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator';
import type { SessionAdmin } from '../../common/types/session-admin';
import { ProductsService } from './products.service';
import { ProductDto, RejectProductDto } from './dto/product.dto';

/** Shop products (API_REQUESTS #21). */
@Controller('products')
@UseGuards(JwtAuthGuard, SectionGuard)
@RequireSection('shopOrders')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list() {
    return this.products.list();
  }

  @Post()
  create(@CurrentAdmin() admin: SessionAdmin, @Body() dto: ProductDto) {
    return this.products.save(admin, null, dto);
  }

  @Patch(':id')
  update(@CurrentAdmin() admin: SessionAdmin, @Param('id') id: string, @Body() dto: ProductDto) {
    return this.products.save(admin, id, dto);
  }

  /** The editor's Reject: Super Admin only. */
  @Post(':id/reject')
  @HttpCode(200)
  @RequireSection('superAdmin')
  reject(@CurrentAdmin() admin: SessionAdmin, @Param('id') id: string, @Body() dto: RejectProductDto) {
    return this.products.reject(admin, id, dto.reason ?? null);
  }
}
