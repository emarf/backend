import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly db: Pool) {}

  async create(dto: CreateOrderDto) {
    // A transaction needs one dedicated connection: every query must go through the same client
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const user = await client.query('SELECT 1 FROM users WHERE id = $1', [dto.userId]);
      if (user.rowCount === 0) throw new NotFoundException(`User ${dto.userId} not found`);

      // FOR UPDATE locks the event row until COMMIT, so two orders for the same event
      // cannot check free seats at the same time (more about this in the transactions module)
      const event = await client.query(
        `SELECT e.base_price, v.capacity
         FROM events e JOIN venues v ON v.id = e.venue_id
         WHERE e.id = $1
         FOR UPDATE OF e`,
        [dto.eventId],
      );
      if (event.rowCount === 0) throw new NotFoundException(`Event ${dto.eventId} not found`);
      const { base_price: price, capacity } = event.rows[0];

      // Seats of cancelled/refunded orders are free again, but their seat numbers stay used
      const seats = await client.query(
        `SELECT count(*) FILTER (WHERE o.status IN ('paid', 'pending'))::int AS taken,
                coalesce(max(t.seat_no), 0) AS last_seat
         FROM tickets t JOIN orders o ON o.id = t.order_id
         WHERE t.event_id = $1`,
        [dto.eventId],
      );
      const { taken, last_seat: lastSeat } = seats.rows[0];
      if (capacity - taken < dto.quantity) {
        throw new ConflictException('Not enough free seats');
      }

      const order = await client.query(
        `INSERT INTO orders (user_id, status, created_at) VALUES ($1, 'pending', now()) RETURNING id`,
        [dto.userId],
      );
      const orderId = order.rows[0].id;

      const tickets = await client.query(
        `INSERT INTO tickets (order_id, event_id, seat_no, price)
         SELECT $1, $2, $3 + n, $4 FROM generate_series(1, $5::int) AS n
         RETURNING id, event_id, seat_no, price`,
        [orderId, dto.eventId, lastSeat, price, dto.quantity],
      );

      await client.query('COMMIT');

      const items = tickets.rows
        .map((t) => ({ id: t.id, eventId: t.event_id, seatNo: t.seat_no, price: Number(t.price) }))
        .sort((a, b) => a.id - b.id);
      return {
        id: orderId,
        userId: dto.userId,
        status: 'pending',
        total: items.reduce((sum, t) => sum + t.price, 0),
        tickets: items,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async pay(id: number) {
    const updated = await this.db.query(
      `UPDATE orders SET status = 'paid' WHERE id = $1 AND status = 'pending' RETURNING id, status`,
      [id],
    );
    if (updated.rowCount === 1) return updated.rows[0];

    const exists = await this.db.query('SELECT status FROM orders WHERE id = $1', [id]);
    if (exists.rowCount === 0) throw new NotFoundException(`Order ${id} not found`);
    throw new ConflictException(`Order ${id} is ${exists.rows[0].status}, only pending orders can be paid`);
  }
}
