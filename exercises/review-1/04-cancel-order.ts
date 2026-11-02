import type { PrismaClient } from '../../api/src/generated/prisma/client';

// Task 04
export async function cancelOrder(
  prisma: PrismaClient,
  id: number,
): Promise<'cancelled' | 'not_found' | 'not_pending'> {
  throw new Error('Task 04 is not done yet');
}
