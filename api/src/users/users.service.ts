import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { CreateUserDto } from './dto/user.dto';
import { USER_SELECT } from './public-user';
import { ORDER_WITH_TICKETS, toUserOrder } from './user-order';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create({ email, name, city }: CreateUserDto, hash?: string) {
    try {
      return await this.prisma.user.create({
        select: USER_SELECT,
        data: { email, name, city, createdAt: new Date(), passwordHash: hash },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(`Email ${email} is already taken`);
      }
      throw error;
    }
  }

  async getUserOrders(id: number) {
    const user = await this.prisma.user.findUnique({
      select: { id: true },
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`No user with id ${id}`);
    }

    const orders = await this.prisma.order.findMany({
      where: { userId: id },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: ORDER_WITH_TICKETS,
    });

    return orders.map(toUserOrder);
  }

  async getUserOrder(userId: number, orderId: number) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: ORDER_WITH_TICKETS,
    });

    if (!order) {
      throw new NotFoundException(`No order with id ${orderId}`);
    }

    return toUserOrder(order);
  }

  async findByEmailWithPasswordHash(email: string) {
    return this.prisma.user.findUnique({
      select: {
        ...USER_SELECT,
        passwordHash: true,
      },
      where: { email },
    });
  }
}
