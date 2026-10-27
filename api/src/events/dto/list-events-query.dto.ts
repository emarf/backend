import { Type } from "class-transformer";
import {
  IsInt,
  IsIn,
  IsOptional,
  Max,
  Min,
  IsNumber,
  IsString
} from "class-validator";
import { CATEGORIES } from "./event.dto";

export class ListEventsQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;

  @IsOptional()
  @IsIn(CATEGORIES)
  category: string;

  @IsOptional()
  @IsString()
  @Type(() => String)
  city: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  minPrice: number;
}
