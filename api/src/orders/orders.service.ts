import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { CreateOrderDto, ORDER_STATUS } from './dto/order.dto';

// The service holds the logic and talks to the database. It knows nothing about HTTP.
@Injectable()
export class OrdersService {
  constructor(private readonly db: Pool) {}

  async createOrder(dto: CreateOrderDto) {
    const client = await this.db.connect();

    try {
      await client.query('begin');

      const { rows: userRows } = await client.query(
        `
      select 1 from users u
      where u.id = $1;
      `,
        [dto.userId],
      );

      if (userRows.length === 0) {
        throw new NotFoundException(`No user with id ${dto.userId}`);
      }

      const { rows: eventRows } = await client.query<{
        base_price: string;
        capacity: number;
      }>(
        `
      select e.base_price, v.capacity 
      from events e
      join venues v
      on e.venue_id = v.id 
      where e.id = $1
      `,
        [dto.eventId],
      );

      if (eventRows.length === 0) {
        throw new NotFoundException(`No event with id ${dto.eventId}`);
      }

      const { rows: rowsCounters } = await client.query<{
        taken: number;
        max_seat: number;
      }>(
        `
      select (count(*) filter(where o.status in ('paid', 'pending')))::int as taken, 
              coalesce(max(t.seat_no), 0) as max_seat
      from events e
      left join tickets t
      on e.id = t.event_id
      left join orders o
      on o.id = t.order_id
      where e.id = $1
      `,
        [dto.eventId],
      );

      const { capacity, base_price } = eventRows[0];
      const { taken, max_seat } = rowsCounters[0];

      if (capacity - taken < dto.quantity) {
        throw new ConflictException(`Not enough empty seats`);
      }

      const { rows: orderRows } = await client.query<{
        id: number;
        user_id: number;
        status: string;
      }>(
        `
      insert into orders(user_id, status, created_at)
      values ($1, 'pending', now())
      returning id, user_id, status
      `,
        [dto.userId],
      );

      const { rows } = await client.query<{
        id: number;
        event_id: number;
        seat_no: number;
        price: string;
      }>(
        `
        insert into tickets(order_id, event_id, seat_no, price)
        select $1, $2, $3 + n, $4 from generate_series(1, $5) as n
        returning id, event_id, seat_no, price
        `,
        [orderRows[0].id, dto.eventId, max_seat, base_price, dto.quantity],
      );

      const tickets = rows.map((row) => {
        const { id, event_id, seat_no, price } = row;
        return {
          id,
          eventId: event_id,
          seatNo: seat_no,
          price: parseFloat(price),
        };
      });

      await client.query('commit');

      const { id, user_id, status } = orderRows[0];

      return {
        id,
        userId: user_id,
        status,
        total: tickets.reduce((acc, { price }) => acc + price, 0),
        tickets,
      };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async pay(id: number) {
    const { rows } = await this.db.query(
      `
      select 1 from orders o
      where o.id = $1
      `,
      [id],
    );

    const row = rows[0];

    if (!row) {
      throw new NotFoundException(`No order with id ${id}`);
    }

    const { rows: updatedOrder, rowCount } = await this.db.query(
      `
      update orders
      set status = $1
      where id = $2 and status = $3
      returning id, status
      `,
      [ORDER_STATUS.PAID, id, ORDER_STATUS.PENDING],
    );

    if (rowCount === 0) {
      throw new ConflictException(
        `Order ${id} is already not ${ORDER_STATUS.PENDING}`,
      );
    }

    return updatedOrder[0];
  }
}
