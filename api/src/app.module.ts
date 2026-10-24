import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { VenuesModule } from './venues/venues.module';

@Module({
  imports: [DatabaseModule, VenuesModule],
})
export class AppModule {}
