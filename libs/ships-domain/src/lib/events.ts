import { Ship, ShipEvent, ShipEventHandler, ShipEventType } from './interfaces';

const handlers = new Set<ShipEventHandler>();

function emit(type: ShipEventType, ship: Ship): void {
  console.log('[ShipEvents] Emitting', type, 'ship:', ship.name, '| handlers count:', handlers.size);
  const event: ShipEvent = {
    type,
    ship: { ...ship },
    timestamp: Date.now(),
  };
  handlers.forEach((handler) => handler(event));
}

export const ShipEvents = {
  subscribe(handler: ShipEventHandler): () => void {
    console.log('[ShipEvents] subscribe called | handlers before:', handlers.size);
    handlers.add(handler);
    console.log('[ShipEvents] subscribe done | handlers after:', handlers.size);
    return () => handlers.delete(handler);
  },
  emitCreated(ship: Ship): void {
    emit('created', ship);
  },
  emitUpdated(ship: Ship): void {
    emit('updated', ship);
  },
  emitDeleted(ship: Ship): void {
    emit('deleted', ship);
  },
};
