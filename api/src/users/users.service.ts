import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { UserOrder } from './dto/order.dto';
import { CreateUserDto, UserDto } from './dto/user.dto';

// The service holds the logic and talks to the database. It knows nothing about HTTP.
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create({ email, name, city }: CreateUserDto): Promise<UserDto> {
    try {
      return await this.prisma.user.create({
        select: {
          id: true,
          email: true,
          name: true,
          city: true,
          createdAt: true,
        },
        data: { email, name, city, createdAt: new Date() },
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

  async getUserOrders(id: number): Promise<UserOrder[]> {
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
      include: { tickets: { orderBy: { id: 'asc' } } },
    });

    return orders.map((order) => ({
      id: order.id,
      status: order.status,
      createdAt: order.createdAt,
      total: order.tickets
        .reduce((acc, { price }) => acc.add(price), new Prisma.Decimal(0))
        .toNumber(),
      tickets: order.tickets.map((ticket) => ({
        id: ticket.id,
        eventId: ticket.eventId,
        seatNo: ticket.seatNo,
        price: ticket.price.toNumber(),
      })),
    }));
  }
}
