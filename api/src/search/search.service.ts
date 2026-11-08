import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class SearchService {
  constructor(private readonly db: Pool) {}

  async search(q: string): Promise<{ id: number; title: string }[]> {
    const { rows } = await this.db.query(
      `select id, title from events where title ilike $1 order by id`,
      [`%${q}%`],
    );
    return rows;
  }
}
