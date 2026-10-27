export interface EventDto {
  id: number;
  title: string;
  category: string;
  startsAt: Date;
  basePrice: number;
  venueId: number;
}

export interface EventsPage {
  items: EventDto[];
  total: number;
}

export const CATEGORIES = [
  "concert",
  "theatre",
  "standup",
  "sport",
  "festival"
] as const;
