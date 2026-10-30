import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { CreateOrderDto } from './dto/order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  // An interactive transaction: every query inside goes through `tx`, one connection, one BEGIN/COMMIT.
  // Throwing inside the callback rolls everything back.
  create(dto: CreateOrderDto) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: dto.userId },
        select: { id: true },
      });
      if (!user) throw new NotFoundException(`User ${dto.userId} not found`);

      // Prisma has no API for row locks, so this query stays raw SQL. The tagged template turns
      // ${...} into a $1 parameter — it is NOT string concatenation.
      const [event] = await tx.$queryRaw<
        { base_price: Prisma.Decimal; capacity: number }[]
      >`
        SELECT e.base_price, v.capacity
        FROM events e JOIN venues v ON v.id = e.venue_id
        WHERE e.id = ${dto.eventId}
        FOR UPDATE OF e`;
      if (!event) throw new NotFoundException(`Event ${dto.eventId} not found`);

      const taken = await tx.ticket.count({
        where: {
          eventId: dto.eventId,
          order: { status: { in: ['paid', 'pending'] } },
        },
      });
      if (event.capacity - taken < dto.quantity) {
        throw new ConflictException('Not enough free seats');
      }

      const last = await tx.ticket.aggregate({
        where: { eventId: dto.eventId },
        _max: { seatNo: true },
      });
      const lastSeat = last._max.seatNo ?? 0;

      const order = await tx.order.create({
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
        include: { tickets: { orderBy: { id: 'asc' } } },
      });

      return {
        id: order.id,
        userId: order.userId,
        status: order.status,
        // Decimal adds money exactly; convert to a JS number only for the response
        total: order.tickets
          .reduce((sum, t) => sum.add(t.price), new Prisma.Decimal(0))
          .toNumber(),
        tickets: order.tickets.map((t) => ({
          id: t.id,
          eventId: t.eventId,
          seatNo: t.seatNo,
          price: t.price.toNumber(),
        })),
      };
    });
  }

  async pay(id: number) {
    // updateMany, not update: `update` needs a unique filter and cannot check the status
    const { count } = await this.prisma.order.updateMany({
      where: { id, status: 'pending' },
      data: { status: 'paid', paidAt: new Date() },
    });
    if (count === 1) return { id, status: 'paid' };

    const order = await this.prisma.order.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    throw new ConflictException(
      `Order ${id} is ${order.status}, only pending orders can be paid`,
    );
  }
}
