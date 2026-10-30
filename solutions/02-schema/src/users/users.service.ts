import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/user.dto';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    try {
      return await this.prisma.user.create({
        data: { ...dto, createdAt: new Date() },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(`Email ${dto.email} is already taken`);
      }
      throw error;
    }
  }

  async getUserOrders(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        orders: {
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          include: { tickets: { orderBy: { id: 'asc' } } },
        },
      },
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);

    return user.orders.map((order) => ({
      id: order.id,
      status: order.status,
      createdAt: order.createdAt,
      total: order.tickets
        .reduce((sum, t) => sum.add(t.price), new Prisma.Decimal(0))
        .toNumber(),
      tickets: order.tickets.map((t) => ({
        id: t.id,
        eventId: t.eventId,
        seatNo: t.seatNo,
        price: t.price.toNumber(),
      })),
    }));
  }
}
