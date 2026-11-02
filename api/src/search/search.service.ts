import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class SearchService {
  constructor(private readonly db: Pool) {}

  // ⚠️ Vulnerable on purpose — module 4, task 08. Do not copy this pattern.
  async search(q: string): Promise<{ id: number; title: string }[]> {
    const { rows } = await this.db.query(
      `select id, title from events where title ilike '%${q}%' order by id`,
    );
    return rows;
  }
}
