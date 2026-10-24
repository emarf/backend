import { INestApplication } from '@nestjs/common';

// App-wide configuration (pipes, filters, prefixes...).
// Used both by main.ts and by the e2e tests, so the tests run the app exactly as in production.
export function setupApp(app: INestApplication): void {
  app.enableShutdownHooks();
}
