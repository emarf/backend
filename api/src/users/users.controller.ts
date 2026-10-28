import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { CreateUserDto } from './dto/user.dto';
import { UsersService } from './users.service';
import { UserOrder } from './dto/order.dto';

// The controller only deals with HTTP: which URL, which method, what goes in and out.
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get(':id/orders')
  getUserOrders(@Param('id', ParseIntPipe) id: number): Promise<UserOrder[]> {
    return this.usersService.getUserOrders(id);
  }
}
