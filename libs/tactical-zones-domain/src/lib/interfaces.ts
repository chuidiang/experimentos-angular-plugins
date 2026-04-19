export interface ZonePoint {
  lat: number;
  lng: number;
}

export interface TacticalZone {
  id: string;
  name: string;
  points: ZonePoint[];
}

export type TacticalZoneEventType = 'created' | 'updated' | 'deleted';

export interface TacticalZoneEvent {
  type: TacticalZoneEventType;
  zone: TacticalZone;
  timestamp: number;
}

export type TacticalZoneEventHandler = (event: TacticalZoneEvent) => void;
