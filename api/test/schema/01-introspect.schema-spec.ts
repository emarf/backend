import { createPrisma, loadPrismaModule } from './helpers';

describe('01 · Prisma schema from the existing database', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;

  beforeAll(() => {
    prisma = createPrisma();
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it('has a PascalCase model for every table', () => {
    const { Prisma } = loadPrismaModule();
    expect(Object.values(Prisma.ModelName)).toEqual(
      expect.arrayContaining(['User', 'Venue', 'Event', 'Order', 'Ticket']),
    );
  });

  it('uses camelCase field names', () => {
    const { Prisma } = loadPrismaModule();
    expect(Object.keys(Prisma.UserScalarFieldEnum)).toContain('createdAt');
    expect(Object.keys(Prisma.EventScalarFieldEnum)).toEqual(
      expect.arrayContaining(['venueId', 'startsAt', 'basePrice']),
    );
    expect(Object.keys(Prisma.OrderScalarFieldEnum)).toEqual(
      expect.arrayContaining(['userId', 'createdAt']),
    );
    expect(Object.keys(Prisma.TicketScalarFieldEnum)).toEqual(
      expect.arrayContaining(['orderId', 'eventId', 'seatNo']),
    );
  });

  it('maps the models to the existing tables and columns', async () => {
    const event = await prisma.event.findUnique({
      where: { id: 7 },
      include: { venue: true },
    });
    expect(event.startsAt.toISOString()).toBe('2026-05-03T19:00:00.000Z');
    expect(event.venue.city).toBe('Lisbon');
  });

  it('names relation fields by meaning: user.orders, order.tickets, ticket.event', async () => {
    const user = await prisma.user.findUnique({
      where: { id: 6 },
      include: {
        orders: { include: { tickets: { include: { event: true } } } },
      },
    });
    expect(user.orders).toHaveLength(19);
    const ticket = user.orders.flatMap(
      (o: { tickets: unknown[] }) => o.tickets,
    )[0];
    expect(ticket.event.title).toEqual(expect.any(String));
  });
});
