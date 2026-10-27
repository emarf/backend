import { EventDto } from "../dto/event.dto";
import { RawEvent } from "../events.service";

export const toEventDto = (item: RawEvent): EventDto => {
  return {
    id: item.id,
    title: item.title,
    category: item.category,
    startsAt: item.starts_at,
    basePrice: parseFloat(item.base_price),
    venueId: item.venue_id
  };
};
