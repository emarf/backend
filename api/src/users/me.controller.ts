import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { PublicUser } from './public-user';
import { UsersService } from './users.service';

@Controller('me')
export class MeController {
  constructor(private readonly usersService: UsersService) {}

  @Get('/orders')
  async getUserOrders(@CurrentUser() user: PublicUser) {
    return await this.usersService.getUserOrders(user.id);
  }

  @Get('/orders/:id')
  async getUserOrder(
    @CurrentUser() user: PublicUser,
    @Param('id', ParseIntPipe) orderId: number,
  ) {
    return await this.usersService.getUserOrder(user.id, orderId);
  }
}
