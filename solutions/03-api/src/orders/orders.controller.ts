import { Body, Controller, HttpCode, Param, ParseIntPipe, Post } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  @Post(':id/pay')
  @HttpCode(200)
  pay(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.pay(id);
  }
}
