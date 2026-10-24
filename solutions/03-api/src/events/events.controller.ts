import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ListEventsQuery } from './dto/list-events.query';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  findAll(@Query() query: ListEventsQuery) {
    return this.eventsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.eventsService.findOne(id);
  }

  @Get(':id/availability')
  availability(@Param('id', ParseIntPipe) id: number) {
    return this.eventsService.availability(id);
  }
}
