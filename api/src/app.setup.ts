import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { ALLOWED_ORIGINS } from './allowed-origins';
import { csrf } from './csrf.middleware';

// App-wide configuration (pipes, filters, prefixes...).
// Used both by main.ts and by the e2e tests, so the tests run the app exactly as in production.
export function setupApp(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.enableShutdownHooks();
  app.use(cookieParser());
  app.enableCors({
    origin: ALLOWED_ORIGINS,
    credentials: true,
  });
  app.use(csrf);
}
