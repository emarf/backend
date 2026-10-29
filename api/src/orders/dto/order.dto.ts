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
