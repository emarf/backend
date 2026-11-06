import { Prisma } from '../generated/prisma/client';

export const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  city: true,
  createdAt: true,
} as const;

export type PublicUser = Prisma.UserGetPayload<{ select: typeof USER_SELECT }>;
