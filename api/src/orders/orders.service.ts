import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { CreateOrderDto, ORDER_STATUS } from './dto/order.dto';

// The service holds the logic and talks to the database. It knows nothing about HTTP.
@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(dto: CreateOrderDto) {
    return await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        select: { id: true },
        where: { id: dto.userId },
      });

      if (!user) {
        throw new NotFoundException(`No user with id ${dto.userId}`);
      }

      const [event] = await tx.$queryRaw<
        {
          base_price: Prisma.Decimal;
          capacity: number;
        }[]
      >`
        select e.base_price, v.capacity
        from events e
        join venues v
        on e.venue_id = v.id
        where e.id = ${dto.eventId}
        for update of e
        `;

      if (!event) {
        throw new NotFoundException(`No event with id ${dto.eventId}`);
      }

      const taken = await tx.ticket.count({
        where: {
          eventId: dto.eventId,
          order: { status: { in: ['paid', 'pending'] } },
        },
      });

      if (event.capacity - taken < dto.quantity) {
        throw new ConflictException(`Not enough empty seats`);
      }

      const last = await tx.ticket.aggregate({
        where: { eventId: dto.eventId },
        _max: { seatNo: true },
      });

      const lastSeat = last._max.seatNo ?? 0;

      const order = await tx.order.create({
        select: { id: true, userId: true, status: true, tickets: true },
        data: {
          userId: dto.userId,
          status: 'pending',
          createdAt: new Date(),
          tickets: {
            createMany: {
              data: Array.from({ length: dto.quantity }, (_, i) => ({
                eventId: dto.eventId,
                seatNo: lastSeat + i + 1,
                price: event.base_price,
              })),
            },
          },
        },
      });

      return {
        id: order.id,
        userId: order.userId,
        status: order.status,
        total: order.tickets
          .reduce((acc, { price }) => acc.add(price), new Prisma.Decimal(0))
          .toNumber(),
        tickets: order.tickets.map((ticket) => ({
          id: ticket.id,
          eventId: ticket.eventId,
          seatNo: ticket.seatNo,
          price: ticket.price.toNumber(),
        })),
      };
    });
  }

  async pay(id: number) {
    const { count } = await this.prisma.order.updateMany({
      data: { status: ORDER_STATUS.PAID, paidAt: new Date() },
      where: { id, status: ORDER_STATUS.PENDING },
    });

    if (count) return { id, status: ORDER_STATUS.PAID };

    const order = await this.prisma.order.findUnique({
      select: { id: true },
      where: { id },
    });

    if (!order) {
      throw new NotFoundException(`No order with id ${id}`);
    }

    throw new ConflictException(
      `Order ${id} is already not ${ORDER_STATUS.PENDING}`,
    );
  }
}
