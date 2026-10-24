import { Controller, Get } from '@nestjs/common';
import { Venue, VenuesService } from './venues.service';

// The controller only deals with HTTP: which URL, which method, what goes in and out.
@Controller('venues')
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Get()
  findAll(): Promise<Venue[]> {
    return this.venuesService.findAll();
  }
}
