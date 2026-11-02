import type { PrismaClient } from '../../api/src/generated/prisma/client';

// Task 04
export async function cancelOrder(
  prisma: PrismaClient,
  id: number,
): Promise<'cancelled' | 'not_found' | 'not_pending'> {
  const { count } = await prisma.order.updateMany({
    data: { status: 'cancelled' },
    where: { id, status: 'pending' },
  });

  if (count) {
    return 'cancelled';
  }

  const order = await prisma.order.findUnique({
    select: { id: true },
    where: { id },
  });

  if (!order) {
    return 'not_found';
  }

  return 'not_pending';
}
