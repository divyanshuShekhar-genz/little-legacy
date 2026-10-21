import { Module } from '@nestjs/common';
import { CountryPricesController, PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [ProductsModule],
  controllers: [PlansController, CountryPricesController],
  providers: [PlansService],
})
export class PlansModule {}
