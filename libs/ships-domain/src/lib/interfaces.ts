export interface Ship {
  id: string;
  name: string;
  lat: number;
  lng: number;
  speedKnots: number;
}

export type ShipEventType = 'created' | 'updated' | 'deleted';

export interface ShipEvent {
  type: ShipEventType;
  ship: Ship;
  timestamp: number;
}

export type ShipEventHandler = (event: ShipEvent) => void;
