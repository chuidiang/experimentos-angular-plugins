import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlarmService, AlarmEvent } from '../alarm-service';

@Component({
  selector: 'app-plugin_alarms-entry',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="alarms-container">
      <h2>⚠️ Alarmas de Zonas</h2>
      <div *ngIf="alarms().length === 0" class="no-alarms">
        No hay alarmas activas
      </div>
      <div *ngFor="let alarm of alarms()" class="alarm-item">
        <div class="alarm-header">
          <span class="ship-name">{{ alarm.ship.name }}</span>
          <span class="zone-name">en zona {{ alarm.zone.name }}</span>
          <button (click)="dismissAlarm(alarm)" class="dismiss-btn">✕</button>
        </div>
        <div class="alarm-details">
          <small>Coordenadas del barco: {{ alarm.ship.lat.toFixed(2) }}, {{ alarm.ship.lng.toFixed(2) }}</small>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .alarms-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 350px;
      max-height: 400px;
      background: white;
      border: 2px solid #dc2626;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 1000;
      font-family: system-ui, -apple-system, sans-serif;
      overflow-y: auto;
    }

    h2 {
      margin: 0 0 12px 0;
      font-size: 16px;
      color: #dc2626;
      font-weight: 600;
    }

    .no-alarms {
      color: #6b7280;
      text-align: center;
      padding: 20px 0;
      font-size: 14px;
    }

    .alarm-item {
      margin-bottom: 12px;
      padding: 12px;
      background: #fef2f2;
      border-left: 4px solid #dc2626;
      border-radius: 4px;
    }

    .alarm-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .ship-name {
      font-weight: 600;
      color: #1f2937;
      flex: 1;
    }

    .zone-name {
      color: #dc2626;
      font-size: 14px;
    }

    .dismiss-btn {
      background: transparent;
      border: none;
      color: #9ca3af;
      cursor: pointer;
      font-size: 16px;
      padding: 0;
      line-height: 1;

      &:hover {
        color: #dc2626;
      }
    }

    .alarm-details {
      font-size: 12px;
      color: #6b7280;
    }
  `],
})
export class RemoteEntry implements OnInit, OnDestroy {
  readonly alarms = signal<AlarmEvent[]>([]);
  private unsubscribe?: () => void;

  constructor(private alarmService: AlarmService) {}

  ngOnInit(): void {
    // Subscribe to alarm events
    this.unsubscribe = this.alarmService.subscribe((event: AlarmEvent) => {
      console.log('[RemoteEntry] Received alarm event:', event.ship.name, event.zone.name);
      const exists = this.alarms().some(
        (a) => a.ship.id === event.ship.id && a.zone.id === event.zone.id
      );
      if (!exists) {
        this.alarms.update(list => [...list, event]);
        console.log('[RemoteEntry] Added alarm, total alarms:', this.alarms().length);
      }
    });
  }

  ngOnDestroy(): void {
    this.unsubscribe?.();
  }

  dismissAlarm(alarm: AlarmEvent): void {
    this.alarms.update(list =>
      list.filter(a => !(a.ship.id === alarm.ship.id && a.zone.id === alarm.zone.id))
    );
  }
}
