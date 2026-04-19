import { Ship } from './interfaces';
import { ShipEvents } from './events';

/**
 * Registry that maintains current state of all ships.
 * Automatically subscribes to ShipEvents and keeps an up-to-date map of ships.
 * Other plugins can query this registry without direct dependencies.
 */
class ShipRegistry {
  private ships = new Map<string, Ship>();
  private initialized = false;

  /**
   * Initialize the registry by subscribing to all ship events.
   * This is called automatically when the library is imported.
   */
  initialize(): void {
    if (this.initialized) return;

    ShipEvents.subscribe((event) => {
      switch (event.type) {
        case 'created':
        case 'updated':
          if (event.ship) {
            this.ships.set(event.ship.id, { ...event.ship });
          }
          break;
        case 'deleted':
          if (event.ship) {
            this.ships.delete(event.ship.id);
          }
          break;
      }
    });

    this.initialized = true;
  }

  /**
   * Get all ships currently in the registry.
   * @returns Array of all ships (immutable copy)
   */
  getAll(): Ship[] {
    return Array.from(this.ships.values()).map(ship => ({ ...ship }));
  }

  /**
   * Get a ship by ID.
   * @param id - Ship ID
   * @returns Ship if found, undefined otherwise (immutable copy)
   */
  getById(id: string): Ship | undefined {
    const ship = this.ships.get(id);
    return ship ? { ...ship } : undefined;
  }

  /**
   * Get the total count of ships.
   * @returns Number of ships in registry
   */
  count(): number {
    return this.ships.size;
  }

  /**
   * Check if a ship exists by ID.
   * @param id - Ship ID
   * @returns true if ship exists, false otherwise
   */
  exists(id: string): boolean {
    return this.ships.has(id);
  }
}

export const shipRegistry = new ShipRegistry();
