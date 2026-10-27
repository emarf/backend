import { Injectable, NotFoundException } from "@nestjs/common";
import { Pool } from "pg";
import { EventsPage } from "./dto/event.dto";
import { ListEventsQuery } from "./dto/list-events-query.dto";
import { toEventDto } from "./utils/toEventDto";

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

@Injectable()
export class EventsService {
  constructor(private readonly db: Pool) {}

  async findAll({ limit, offset }: ListEventsQuery): Promise<EventsPage> {
    const { rows } = await this.db.query<RawEvent>(
      `
      select e.id, e.title, e.category, e.starts_at, e.base_price, e.venue_id
      from events e 
      order by e.starts_at, e.id 
      limit $1 
      offset $2
      `,
      [limit, offset]
    );

    const total = await this.db.query<{ total: number }>(
      "select count(*)::int as total from events"
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
      [id]
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
        capacity: row.venue_capacity
      }
    };
  }
}
