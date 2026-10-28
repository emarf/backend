import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseError, Pool } from 'pg';
import { CreateUserDto, UserDto } from './dto/user.dto';
import { UserOrder } from './dto/order.dto';

interface RawUser {
  id: number;
  email: string;
  name: string;
  city: string | null;
  created_at: Date;
}

interface RawUserOrderBase {
  id: number;
  status: string;
  created_at: Date;
  total: string;
}

type RawOrderTicket =
  | {
      ticket_id: number;
      event_id: number;
      seat_no: number;
      price: string;
    }
  | { ticket_id: null; event_id: null; seat_no: null; price: null };

type RawUserOrder = RawUserOrderBase & RawOrderTicket;

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

  async getUserOrders(id: number): Promise<UserOrder[]> {
    const { rows: userRows } = await this.db.query(
      `
      select 1 from users u
      where u.id = $1;
      `,
      [id],
    );

    if (userRows.length === 0) {
      throw new NotFoundException(`No user with id ${id}`);
    }

    const { rows } = await this.db.query<RawUserOrder>(
      `
      select o.id, o.status, o.created_at, coalesce(sum(t.price) over (partition by o.id), 0) as total,
             t.id as ticket_id, t.event_id, t.seat_no, t.price
      from orders o
      left join tickets t
      on o.id = t.order_id
      where o.user_id = $1
      order by o.created_at desc, o.id desc, t.id
      `,
      [id],
    );

    const hashMap: Map<number, UserOrder> = new Map();

    rows.forEach((row) => {
      let order = hashMap.get(row.id);

      if (!order) {
        order = {
          id: row.id,
          status: row.status,
          createdAt: row.created_at,
          total: parseFloat(row.total),
          tickets: [],
        };

        hashMap.set(row.id, order);
      }

      if (row.ticket_id !== null) {
        order.tickets.push({
          id: row.ticket_id,
          eventId: row.event_id,
          seatNo: row.seat_no,
          price: parseFloat(row.price),
        });
      }
    });

    return [...hashMap.values()];
  }
}
