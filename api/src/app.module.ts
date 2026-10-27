import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { VenuesModule } from './venues/venues.module';
import { EventsModule } from './events/events.module';

@Module({
  imports: [DatabaseModule, VenuesModule, EventsModule],
})
export class AppModule {}
