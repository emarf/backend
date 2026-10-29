import { IsInt, Max, Min } from 'class-validator';

export class CreateOrderDto {
  @IsInt()
  userId: number;

  @IsInt()
  eventId: number;

  @IsInt()
  @Min(1)
  @Max(10)
  quantity: number;
}

export const ORDER_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const;
