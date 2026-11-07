import { Controller, Get } from '@nestjs/common';
import { Venue, VenuesService } from './venues.service';
import { Public } from '../auth/public.decorator';

@Public()
@Controller('venues')
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Get()
  findAll(): Promise<Venue[]> {
    return this.venuesService.findAll();
  }
}
