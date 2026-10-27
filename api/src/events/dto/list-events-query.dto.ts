import { Type } from 'class-transformer';
import {
  IsInt,
  IsIn,
  IsOptional,
  Max,
  Min,
  IsNumber,
  IsString,
} from 'class-validator';
import { CATEGORIES } from './event.dto';

export class ListEventsQuery {
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  offset: number = 0;

  @IsOptional()
  @IsIn(CATEGORIES)
  category: string;

  @IsOptional()
  @IsString()
  city: string;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  minPrice: number;
}
