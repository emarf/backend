import { ConflictException, Injectable } from '@nestjs/common';
import { DatabaseError, Pool } from 'pg';
import { CreateUserDto, UserDto } from './dto/user.dto';

interface RawUser {
  id: number;
  email: string;
  name: string;
  city: string | null;
  created_at: Date;
}

// The service holds the logic and talks to the database. It knows nothing about HTTP.
@Injectable()
export class UsersService {
  constructor(private readonly db: Pool) {}

  async create({ email, name, city }: CreateUserDto): Promise<UserDto> {
    try {
      const { rows } = await this.db.query<RawUser>(
        `
      insert into users (email, name, city, created_at)
      values ($1, $2, $3, now())
      returning id, email, name, city, created_at;
      `,
        [email, name, city ?? null],
      );

      const row = rows[0];

      return {
        id: row.id,
        email: row.email,
        name: row.name,
        city: row.city,
        createdAt: row.created_at,
      };
    } catch (error) {
      if (error instanceof DatabaseError && error.code === '23505') {
        throw new ConflictException(`Email ${email} is already taken`);
      }
      throw error;
    }
  }
}
