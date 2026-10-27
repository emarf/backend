import { Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { EventsPage } from './dto/event.dto';
import { ListEventsQuery } from './dto/list-events-query.dto';
import { toEventDto } from './utils/toEventDto';
import { buildWhere } from './utils/buildWhere';

export interface RawEvent {
  id: number;
  title: string;
  category: string;
  starts_at: Date;
  base_price: string;
  venue_id: number;
}

export interface RawEventWithVenue {
  id: number;
  title: string;
  category: string;
  starts_at: Date;
  base_price: string;
  venue_id: number;
  venue_name: string;
  venue_city: string;
  venue_capacity: number;
}

interface RawEventAvailability {
  event_id: number;
  capacity: number;
  sold: number;
  reserved: number;
  available: number;
}

@Injectable()
export class EventsService {
  constructor(private readonly db: Pool) {}

  async findAll({
    limit,
    offset,
    category,
    city,
    minPrice,
  }: ListEventsQuery): Promise<EventsPage> {
    const { values, where } = buildWhere({
      category,
      city,
      minPrice,
    });

    const total = await this.db.query<{ total: number }>(
      `select count(*)::int as total from events e
      join venues v
      on e.venue_id = v.id
      ${where ? where : ''}`,
      [...values],
    );

    const { rows } = await this.db.query<RawEvent>(
      `
      select e.id, e.title, e.category, e.starts_at, e.base_price, e.venue_id
      from events e
      join venues v
      on e.venue_id = v.id
      ${where ? where : ''}
      order by e.starts_at, e.id 
      limit $${values.length + 1} 
      offset $${values.length + 2} 
      `,
      [...values, limit, offset],
    );

    return { items: rows.map(toEventDto), total: total.rows[0].total };
  }

  async findOne(id: number) {
    const { rows } = await this.db.query<RawEventWithVenue>(
      `select e.id, e.title, e.category, e.starts_at, e.base_price, 
              v.id as venue_id, v.name as venue_name, v.city as venue_city, v.capacity as venue_capacity
      from events e
      join venues v
      on e.venue_id = v.id
      where e.id = $1;
      `,
      [id],
    );

    const row = rows[0];

    if (!row) throw new NotFoundException(`No event with id ${id}`);

    return {
      id: row.id,
      title: row.title,
      category: row.category,
      startsAt: row.starts_at,
      basePrice: parseFloat(row.base_price),
      venue: {
        id: row.venue_id,
        name: row.venue_name,
        city: row.venue_city,
        capacity: row.venue_capacity,
      },
    };
  }

  async getAvailability(id: number) {
    const { rows } = await this.db.query<RawEventAvailability>(
      `
      with counts as (select e.id,
	      count(*) filter(where o.status = 'paid')::int as sold,
	      count(*) filter(where o.status = 'pending')::int as reserved,
	      e.venue_id
        from events e
        left join tickets t 
        on e.id = t.event_id 
        left join orders o 
        on o.id = t.order_id 
        where e.id = $1
        group by e.id
        )
        select c.id as event_id, v.capacity, c.sold, c.reserved, (v.capacity - c.sold - c.reserved) as available
        from counts c
        join venues v
        on v.id = c.venue_id
      `,
      [id],
    );

    const row = rows[0];

    if (!row) throw new NotFoundException(`No event with id ${id}`);

    return {
      eventId: row.event_id,
      capacity: row.capacity,
      sold: row.sold,
      reserved: row.reserved,
      available: row.available,
    };
  }
}
