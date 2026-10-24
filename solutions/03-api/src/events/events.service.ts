import { Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { ListEventsQuery } from './dto/list-events.query';

interface EventRow {
  id: number;
  title: string;
  category: string;
  starts_at: Date;
  base_price: string;
  venue_id: number;
}

const toEvent = (row: EventRow) => ({
  id: row.id,
  title: row.title,
  category: row.category,
  startsAt: row.starts_at,
  basePrice: Number(row.base_price),
  venueId: row.venue_id,
});

@Injectable()
export class EventsService {
  constructor(private readonly db: Pool) {}

  async findAll(query: ListEventsQuery) {
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (query.category !== undefined) {
      params.push(query.category);
      conditions.push(`e.category = $${params.length}`);
    }
    if (query.city !== undefined) {
      params.push(query.city);
      conditions.push(`v.city = $${params.length}`);
    }
    if (query.minPrice !== undefined) {
      params.push(query.minPrice);
      conditions.push(`e.base_price >= $${params.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const total = await this.db.query<{ total: number }>(
      `SELECT count(*)::int AS total FROM events e JOIN venues v ON v.id = e.venue_id ${where}`,
      params,
    );
    const items = await this.db.query<EventRow>(
      `SELECT e.id, e.title, e.category, e.starts_at, e.base_price, e.venue_id
       FROM events e
       JOIN venues v ON v.id = e.venue_id
       ${where}
       ORDER BY e.starts_at, e.id
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, query.limit, query.offset],
    );
    return { items: items.rows.map(toEvent), total: total.rows[0].total };
  }

  async findOne(id: number) {
    const { rows } = await this.db.query(
      `SELECT e.id, e.title, e.category, e.starts_at, e.base_price,
              v.id AS venue_id, v.name AS venue_name, v.city AS venue_city, v.capacity
       FROM events e
       JOIN venues v ON v.id = e.venue_id
       WHERE e.id = $1`,
      [id],
    );
    const row = rows[0];
    if (!row) throw new NotFoundException(`Event ${id} not found`);
    return {
      id: row.id,
      title: row.title,
      category: row.category,
      startsAt: row.starts_at,
      basePrice: Number(row.base_price),
      venue: { id: row.venue_id, name: row.venue_name, city: row.venue_city, capacity: row.capacity },
    };
  }

  async availability(id: number) {
    const { rows } = await this.db.query(
      `SELECT v.capacity,
              count(t.id) FILTER (WHERE o.status = 'paid')::int    AS sold,
              count(t.id) FILTER (WHERE o.status = 'pending')::int AS reserved
       FROM events e
       JOIN venues v ON v.id = e.venue_id
       LEFT JOIN tickets t ON t.event_id = e.id
       LEFT JOIN orders o ON o.id = t.order_id
       WHERE e.id = $1
       GROUP BY v.capacity`,
      [id],
    );
    const row = rows[0];
    if (!row) throw new NotFoundException(`Event ${id} not found`);
    return {
      eventId: id,
      capacity: row.capacity,
      sold: row.sold,
      reserved: row.reserved,
      available: row.capacity - row.sold - row.reserved,
    };
  }
}
