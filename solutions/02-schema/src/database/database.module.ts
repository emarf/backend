import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { Pool } from 'pg';
import { PrismaService } from './prisma.service';

// A pool keeps several open connections to Postgres and hands them out to queries.
// Any service can get it by asking for `Pool` in its constructor.
@Global()
@Module({
  providers: [
    PrismaService,
    {
      provide: Pool,
      useFactory: () =>
        new Pool({
          connectionString:
            process.env.DATABASE_URL ??
            'postgres://app:app@localhost:5432/tickets',
        }),
    },
  ],
  exports: [Pool, PrismaService],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(Pool) private readonly pool: Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
