import {
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ListEventsQuery } from './dto/list-events-query.dto';
import { EventsService } from './events.service';
import { EventsPage } from './dto/event.dto';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @HttpCode(200)
  findAll(@Query() params: ListEventsQuery): Promise<EventsPage> {
    return this.eventsService.findAll(params);
  }

  @Get(':id')
  @HttpCode(200)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.eventsService.findOne(id);
  }

  @Get(':id/availability')
  @HttpCode(200)
  getAvailability(@Param('id', ParseIntPipe) id: number) {
    return this.eventsService.getAvailability(id);
  }
}
