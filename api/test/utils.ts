import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  setupApp(app);
  await app.init();
  return app;
}

// Direct access to the test database, for preparing data and checking what the API wrote
export function createTestDb(): Pool {
  return new Pool({ connectionString: process.env.DATABASE_URL });
}
