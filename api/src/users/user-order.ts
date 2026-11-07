import { Prisma } from '../generated/prisma/client';

export const ORDER_WITH_TICKETS = {
  tickets: { orderBy: { id: 'asc' } },
} as const;

export type OrderWithTickets = Prisma.OrderGetPayload<{
  include: typeof ORDER_WITH_TICKETS;
}>;

export const toUserOrder = (order: OrderWithTickets) => ({
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
});
