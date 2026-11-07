import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { CreateUserDto } from './dto/user.dto';
import { UsersService } from './users.service';
@Public()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get(':id/orders')
  getUserOrders(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.getUserOrders(id);
  }
}
