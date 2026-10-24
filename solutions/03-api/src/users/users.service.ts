import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseError, Pool } from 'pg';
import { CreateUserDto } from './dto/create-user.dto';

const UNIQUE_VIOLATION = '23505';

@Injectable()
export class UsersService {
  constructor(private readonly db: Pool) {}

  async create(dto: CreateUserDto) {
    try {
      const { rows } = await this.db.query(
        `INSERT INTO users (email, name, city, created_at)
         VALUES ($1, $2, $3, now())
         RETURNING id, email, name, city, created_at`,
        [dto.email, dto.name, dto.city ?? null],
      );
      const row = rows[0];
      return { id: row.id, email: row.email, name: row.name, city: row.city, createdAt: row.created_at };
    } catch (error) {
      if (error instanceof DatabaseError && error.code === UNIQUE_VIOLATION) {
        throw new ConflictException(`Email ${dto.email} is already taken`);
      }
      throw error;
    }
  }

  async orders(userId: number) {
    const user = await this.db.query('SELECT 1 FROM users WHERE id = $1', [userId]);
    if (user.rowCount === 0) throw new NotFoundException(`User ${userId} not found`);

    const { rows } = await this.db.query(
      `SELECT o.id AS order_id, o.status, o.created_at,
              t.id AS ticket_id, t.event_id, t.seat_no, t.price
       FROM orders o
       LEFT JOIN tickets t ON t.order_id = o.id
       WHERE o.user_id = $1
       ORDER BY o.created_at DESC, o.id DESC, t.id`,
      [userId],
    );

    // One row per ticket → one object per order with its tickets inside
    const orders = new Map<number, any>();
    for (const row of rows) {
      let order = orders.get(row.order_id);
      if (!order) {
        order = { id: row.order_id, status: row.status, createdAt: row.created_at, total: 0, tickets: [] };
        orders.set(row.order_id, order);
      }
      if (row.ticket_id !== null) {
        const price = Number(row.price);
        order.tickets.push({ id: row.ticket_id, eventId: row.event_id, seatNo: row.seat_no, price });
        order.total += price;
      }
    }
    return [...orders.values()];
  }
}
