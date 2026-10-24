import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';

export interface Venue {
  id: number;
  name: string;
  city: string;
  capacity: number;
}

// The service holds the logic and talks to the database. It knows nothing about HTTP.
@Injectable()
export class VenuesService {
  constructor(private readonly db: Pool) {}

  async findAll(): Promise<Venue[]> {
    const { rows } = await this.db.query<Venue>(
      'SELECT id, name, city, capacity FROM venues ORDER BY id',
    );
    return rows;
  }
}
