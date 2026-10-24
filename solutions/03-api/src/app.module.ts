import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { EventsModule } from './events/events.module';
import { OrdersModule } from './orders/orders.module';
import { UsersModule } from './users/users.module';
import { VenuesModule } from './venues/venues.module';

@Module({
  imports: [DatabaseModule, VenuesModule, EventsModule, UsersModule, OrdersModule],
})
export class AppModule {}
