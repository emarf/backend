import type { PrismaClient } from '../../api/src/generated/prisma/client';

// Task 03
export async function venueSchedule(prisma: PrismaClient, venueId: number) {
  const venue = await prisma.venue.findUnique({
    select: {
      name: true,
      city: true,
      events: {
        select: { id: true, title: true, startsAt: true, basePrice: true },
        orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
      },
    },
    where: { id: venueId },
  });

  if (!venue) {
    return null;
  }

  return {
    name: venue.name,
    city: venue.city,
    events: venue.events.map((event) => ({
      id: event.id,
      title: event.title,
      startsAt: event.startsAt,
      basePrice: event.basePrice.toNumber(),
    })),
  };
}
