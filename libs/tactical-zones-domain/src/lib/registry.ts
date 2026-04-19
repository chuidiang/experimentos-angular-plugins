import { TacticalZone } from './interfaces';
import { TacticalZoneEvents } from './events';

/**
 * Registry that maintains current state of all tactical zones.
 * Automatically subscribes to TacticalZoneEvents and keeps an up-to-date map of zones.
 * Other plugins can query this registry without direct dependencies.
 */
class TacticalZoneRegistry {
  private zones = new Map<string, TacticalZone>();
  private initialized = false;

  /**
   * Initialize the registry by subscribing to all tactical zone events.
   * This is called automatically when the library is imported.
   */
  initialize(): void {
    if (this.initialized) return;

    TacticalZoneEvents.subscribe((event) => {
      switch (event.type) {
        case 'created':
        case 'updated':
          if (event.zone) {
            // Deep copy to avoid external mutations
            this.zones.set(event.zone.id, {
              ...event.zone,
              points: [...event.zone.points],
            });
          }
          break;
        case 'deleted':
          if (event.zone) {
            this.zones.delete(event.zone.id);
          }
          break;
      }
    });

    this.initialized = true;
  }

  /**
   * Get all tactical zones currently in the registry.
   * @returns Array of all zones (immutable copies)
   */
  getAll(): TacticalZone[] {
    return Array.from(this.zones.values()).map((zone) => ({
      ...zone,
      points: [...zone.points],
    }));
  }

  /**
   * Get a tactical zone by ID.
   * @param id - Zone ID
   * @returns Zone if found, undefined otherwise (immutable copy)
   */
  getById(id: string): TacticalZone | undefined {
    const zone = this.zones.get(id);
    return zone
      ? {
          ...zone,
          points: [...zone.points],
        }
      : undefined;
  }

  /**
   * Get the total count of zones.
   * @returns Number of zones in registry
   */
  count(): number {
    return this.zones.size;
  }

  /**
   * Check if a zone exists by ID.
   * @param id - Zone ID
   * @returns true if zone exists, false otherwise
   */
  exists(id: string): boolean {
    return this.zones.has(id);
  }

  /**
   * Search zones by name (case-insensitive).
   * @param name - Zone name to search for
   * @returns Array of zones matching the name (immutable copies)
   */
  getByName(name: string): TacticalZone[] {
    const lowerName = name.toLowerCase();
    return Array.from(this.zones.values())
      .filter((zone) => zone.name.toLowerCase().includes(lowerName))
      .map((zone) => ({
        ...zone,
        points: [...zone.points],
      }));
  }
}

export const tacticalZoneRegistry = new TacticalZoneRegistry();
