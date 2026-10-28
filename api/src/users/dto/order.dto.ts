export interface UserOrder {
  id: number;
  status: string;
  createdAt: Date;
  total: number;
  tickets: {
    id: number;
    eventId: number;
    seatNo: number;
    price: number;
  }[];
}
