import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { SectionGuard } from '../../common/guards/section.guard';
import { RequireSection } from '../../common/decorators/section.decorator';
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator';
import type { SessionAdmin } from '../../common/types/session-admin';
import { OrdersService } from './orders.service';
import { ListOrdersDto, UpdateOrderDto } from './dto/order.dto';

/** Shop orders (API_REQUESTS #22). Updates apply directly, not as drafts (OPEN_QUESTIONS Q31). */
@Controller('orders')
@UseGuards(JwtAuthGuard, SectionGuard)
@RequireSection('shopOrders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list(@Query() query: ListOrdersDto) {
    return this.orders.list(query);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.orders.get(id);
  }

  @Patch(':id')
  update(@CurrentAdmin() admin: SessionAdmin, @Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return this.orders.update(admin, id, dto);
  }
}
