import { Injectable, NgZone } from '@angular/core';
import {
  shipRegistry,
  ShipEvents,
  Ship,
} from '@mi-sistema-plugins/ships-domain';
import {
  tacticalZoneRegistry,
  TacticalZoneEvents,
  TacticalZone,
} from '@mi-sistema-plugins/tactical-zones-domain';

export interface AlarmEvent {
  ship: Ship;
  zone: TacticalZone;
  timestamp: number;
}

export type AlarmHandler = (event: AlarmEvent) => void;

/**
 * Service that detects when ships enter tactical zones and emits alarm events.
 * Uses ray-casting algorithm to detect if a point is inside a polygon.
 */
@Injectable({ providedIn: 'root' })
export class AlarmService {
  private handlers: Set<AlarmHandler> = new Set();
  private alarmHistory = new Set<string>(); // Track "shipId-zoneId" pairs already alerted
  private activeAlarms = new Map<string, AlarmEvent>();
  private initialized = false;

  constructor(private ngZone: NgZone) {
    console.log('[AlarmService] Constructor called, initializing registries...');
    shipRegistry.initialize();
    tacticalZoneRegistry.initialize();
    this.initializeService();
  }

  private initializeService(): void {
    if (this.initialized) return;

    console.log('[AlarmService] Initializing...');
    // Initial scan for ships already in zones
    this.scanForShipsInZones();

    // Subscribe to ship events
    ShipEvents.subscribe((event) => {
      console.log('[AlarmService] Ship event:', event.type, event.ship?.name);
      switch (event.type) {
        case 'created':
        case 'updated':
          if (event.ship) {
            this.checkShipInZones(event.ship);
          }
          break;
        case 'deleted':
          if (event.ship) {
            // Remove alarm history for this ship
            const shipId = event.ship.id;
            Array.from(this.alarmHistory)
              .filter((key) => key.startsWith(shipId))
              .forEach((key) => this.alarmHistory.delete(key));
            Array.from(this.activeAlarms.keys())
              .filter((key) => key.startsWith(shipId))
              .forEach((key) => this.activeAlarms.delete(key));
          }
          break;
      }
    });

    // Subscribe to zone events
    TacticalZoneEvents.subscribe((event) => {
      console.log('[AlarmService] Zone event:', event.type, event.zone?.name, 'Registry zones:', tacticalZoneRegistry.getAll().length, 'Ships:', shipRegistry.getAll().length);
      switch (event.type) {
        case 'created':
        case 'updated':
          // Re-scan all ships against this zone (in case it was modified)
          console.log('[AlarmService] Scanning ships in zones after zone change...');
          this.scanForShipsInZones();
          break;
        case 'deleted':
          if (event.zone) {
            // Remove alarm history for this zone
            const zoneId = event.zone.id;
            Array.from(this.alarmHistory)
              .filter((key) => key.endsWith(zoneId))
              .forEach((key) => this.alarmHistory.delete(key));
            Array.from(this.activeAlarms.keys())
              .filter((key) => key.endsWith(zoneId))
              .forEach((key) => this.activeAlarms.delete(key));
          }
          break;
      }
    });

    this.initialized = true;
    console.log('[AlarmService] Initialized successfully');
  }

  /**
   * Scan all ships against all zones to find initial alarms.
   */
  private scanForShipsInZones(): void {
    const ships = shipRegistry.getAll();
    const zones = tacticalZoneRegistry.getAll();

    console.log('[AlarmService] Scanning: ships =', ships.length, 'zones =', zones.length);

    for (const ship of ships) {
      for (const zone of zones) {
        this.checkShipInZone(ship, zone);
      }
    }
  }

  /**
   * Check a ship against a single zone.
   */
  private checkShipInZone(ship: Ship, zone: TacticalZone): void {
    const alarmKey = `${ship.id}-${zone.id}`;
    const isInPolygon = this.isPointInPolygon(ship.lat, ship.lng, zone.points);

    if (isInPolygon) {
      // Ship is in zone
      if (!this.alarmHistory.has(alarmKey)) {
        console.log('[AlarmService] ALARM! Ship', ship.name, 'entered zone', zone.name);
        const event: AlarmEvent = { ship, zone, timestamp: Date.now() };
        this.alarmHistory.add(alarmKey);
        this.activeAlarms.set(alarmKey, event);
        this.emitAlarm(event);
      }
    } else {
      // Ship is not in zone, remove from alarm history if it was there
      this.alarmHistory.delete(alarmKey);
      this.activeAlarms.delete(alarmKey);
    }
  }

  /**
   * Check a ship against all zones.
   */
  private checkShipInZones(ship: Ship): void {
    const zones = tacticalZoneRegistry.getAll();
    for (const zone of zones) {
      this.checkShipInZone(ship, zone);
    }
  }

  /**
   * Determine if a point (lat, lng) is inside a polygon using ray-casting algorithm.
   * @param lat - Point latitude
   * @param lng - Point longitude
   * @param points - Array of polygon vertices with lat/lng
   * @returns true if point is inside polygon, false otherwise
   */
  private isPointInPolygon(
    lat: number,
    lng: number,
    points: Array<{ lat: number; lng: number }>
  ): boolean {
    if (points.length < 3) return false;

    let inside = false;

    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i].lng;
      const yi = points[i].lat;
      const xj = points[j].lng;
      const yj = points[j].lat;

      const intersect =
        yi > lat !== yj > lat &&
        lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }

    return inside;
  }

  /**
   * Subscribe to alarm events.
   * @param handler - Function to call when alarm is triggered
   * @returns Unsubscribe function
   */
  subscribe(handler: AlarmHandler): () => void {
    this.handlers.add(handler);

    this.activeAlarms.forEach((event) => handler(event));

    return () => this.handlers.delete(handler);
  }

  /**
   * Emit alarm to all subscribers (outside Angular zone to avoid change detection loops).
   */
  private emitAlarm(event: AlarmEvent): void {
    // Emit outside Angular zone so that subscribers can control change detection manually
    this.ngZone.runOutsideAngular(() => {
      this.handlers.forEach((handler) => handler(event));
    });
  }

  /**
   * Get alarm history (for debugging).
   */
  getAlarmHistory(): string[] {
    return Array.from(this.alarmHistory);
  }

  /**
   * Clear alarm history (for resetting).
   */
  clearAlarmHistory(): void {
    this.alarmHistory.clear();
    this.activeAlarms.clear();
  }
}
