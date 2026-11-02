import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { VenuesModule } from './venues/venues.module';
import { EventsModule } from './events/events.module';
import { UsersModule } from './users/users.module';
import { OrdersModule } from './orders/orders.module';
import { SearchModule } from './search/search.module';

@Module({
  imports: [
    DatabaseModule,
    VenuesModule,
    EventsModule,
    UsersModule,
    OrdersModule,
    SearchModule,
  ],
})
export class AppModule {}
