import {
  TacticalZone,
  TacticalZoneEvent,
  TacticalZoneEventHandler,
  TacticalZoneEventType,
} from './interfaces';

const handlers = new Set<TacticalZoneEventHandler>();

function emit(type: TacticalZoneEventType, zone: TacticalZone): void {
  console.log('[TacticalZoneEvents] Emitting', type, 'zone:', zone.name, '| handlers count:', handlers.size);
  const event: TacticalZoneEvent = {
    type,
    zone: {
      ...zone,
      points: zone.points.map((point) => ({ ...point })),
    },
    timestamp: Date.now(),
  };
  handlers.forEach((handler) => handler(event));
}

export const TacticalZoneEvents = {
  subscribe(handler: TacticalZoneEventHandler): () => void {
    console.log('[TacticalZoneEvents] subscribe called | handlers before:', handlers.size);
    handlers.add(handler);
    console.log('[TacticalZoneEvents] subscribe done | handlers after:', handlers.size);
    return () => handlers.delete(handler);
  },
  emitCreated(zone: TacticalZone): void {
    emit('created', zone);
  },
  emitUpdated(zone: TacticalZone): void {
    emit('updated', zone);
  },
  emitDeleted(zone: TacticalZone): void {
    emit('deleted', zone);
  },
};
