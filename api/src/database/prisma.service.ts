import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    super({
      adapter: new PrismaPg({
        connectionString:
          process.env.DATABASE_URL ??
          'postgres://app:app@localhost:5432/tickets',
      }),
      log: process.env.PRISMA_LOG ? ['query'] : [],
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
