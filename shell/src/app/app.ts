import { AfterViewInit, Component, createComponent, inject, signal, ApplicationRef, EnvironmentInjector, NgZone } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import * as L from 'leaflet';
import { loadRemote } from '@module-federation/enhanced/runtime';
import { MenuButton, MapContext, LayerItem, MapDialog } from '@mi-sistema-plugins/common-map';

/** Estado interno de un diálogo flotante gestionado por el shell */
interface DialogEntry {
  id: string;
  title: string;
  visible: boolean;
  content: SafeHtml;
  x: number;
  y: number;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements AfterViewInit {
  private map?: L.Map;
  private sanitizer = inject(DomSanitizer);
  private appRef = inject(ApplicationRef);
  private injector = inject(EnvironmentInjector);
  private ngZone = inject(NgZone);

  readonly menuButtons = signal<MenuButton[]>([]);
  readonly dialogs = signal<DialogEntry[]>([]);
  mapContext?: MapContext;

  // ── Drag logic ───────────────────────────────────────────────────────────
  private dragOffset = { x: 0, y: 0 };

  onDragStart(e: MouseEvent, dialogId: string): void {
    const panel = (e.currentTarget as HTMLElement).closest('.float-dialog') as HTMLElement;
    this.dragOffset = { x: e.clientX - panel.offsetLeft, y: e.clientY - panel.offsetTop };
    const onMove = (ev: MouseEvent) => {
      this.dialogs.update((list) =>
        list.map((d) =>
          d.id === dialogId
            ? { ...d, x: ev.clientX - this.dragOffset.x, y: ev.clientY - this.dragOffset.y }
            : d,
        ),
      );
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  closeDialog(id: string): void {
    this.dialogs.update((list) => list.map((d) => (d.id === id ? { ...d, visible: false } : d)));
  }

  ngAfterViewInit(): void {
    this.map = L.map('world-map', {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      zoomControl: true,
      doubleClickZoom: false,
    });

    L.tileLayer.wms('https://ows.terrestris.de/osm/service?', {
      layers: 'OSM-WMS',
      format: 'image/png',
      transparent: false,
      attribution: '&copy; OpenStreetMap contributors | terrestris OSM WMS',
    }).addTo(this.map);

    // Control de capas (overlays registrados dinámicamente por los plugins)
    const layersControl = L.control.layers({}, {}, { collapsed: false }).addTo(this.map);
    const pluginLayers = new Map<string, L.LayerGroup>();
    const namedMarkers = new Map<string, L.CircleMarker>();
    const namedPolygons = new Map<string, L.Polygon>();
    const namedPolylines = new Map<string, L.Polyline>();
    const mapClickHandlers = new Set<(point: { lat: number; lng: number }) => void>();
    const mapDoubleClickHandlers = new Set<(point: { lat: number; lng: number }) => void>();
    const mapMouseMoveHandlers = new Set<(point: { lat: number; lng: number }) => void>();
    const polygonClickHandlers = new Map<string, Set<(polygonId: string) => void>>();

    const getOrCreateLayer = (layerId: string): L.LayerGroup => {
      let layer = pluginLayers.get(layerId);
      if (!layer) {
        layer = L.layerGroup().addTo(this.map!);
        pluginLayers.set(layerId, layer);
      }
      return layer;
    };

    const makeOptions = (style?: { radius?: number; color?: string; fillColor?: string; fillOpacity?: number }) => ({
      radius: style?.radius ?? 8,
      color: style?.color ?? '#003399',
      fillColor: style?.fillColor ?? '#3399ff',
      fillOpacity: style?.fillOpacity ?? 0.8,
    });

    const makePolygonOptions = (style?: { color?: string; fillColor?: string; fillOpacity?: number; weight?: number; dashArray?: string }) => ({
      color: style?.color ?? '#d35400',
      fillColor: style?.fillColor ?? '#f39c12',
      fillOpacity: style?.fillOpacity ?? 0.25,
      weight: style?.weight ?? 2,
      dashArray: style?.dashArray,
    });

    let pendingClick: ReturnType<typeof setTimeout> | null = null;

    this.map.on('click', (event) => {
      const point = { lat: event.latlng.lat, lng: event.latlng.lng };
      if (mapDoubleClickHandlers.size > 0) {
        // Delay single clicks so they can be cancelled when a dblclick fires
        if (pendingClick !== null) {
          clearTimeout(pendingClick);
        }
        pendingClick = setTimeout(() => {
          pendingClick = null;
          mapClickHandlers.forEach((handler) => handler(point));
        }, 250);
      } else {
        mapClickHandlers.forEach((handler) => handler(point));
      }
    });

    this.map.on('dblclick', (event) => {
      if (pendingClick !== null) {
        clearTimeout(pendingClick);
        pendingClick = null;
      }
      const point = { lat: event.latlng.lat, lng: event.latlng.lng };
      mapDoubleClickHandlers.forEach((handler) => handler(point));
    });

    this.map.on('mousemove', (event) => {
      const point = { lat: event.latlng.lat, lng: event.latlng.lng };
      mapMouseMoveHandlers.forEach((handler) => handler(point));
    });

    // MapContext: implementación que el shell provee y los plugins consumen
    this.mapContext = {
      registerLayer: (layerId, displayName) => {
        const layer = getOrCreateLayer(layerId);
        layersControl.addOverlay(layer, displayName);
      },
      addCircleMarker: (layerId, lat, lng, style) => {
        const layer = getOrCreateLayer(layerId);
        L.circleMarker([lat, lng], makeOptions(style)).addTo(layer);
      },
      setCircleMarker: (layerId, markerId, lat, lng, style) => {
        const key = `${layerId}:${markerId}`;
        const existing = namedMarkers.get(key);
        if (existing) {
          existing.setLatLng([lat, lng]);
        } else {
          const layer = getOrCreateLayer(layerId);
          const marker = L.circleMarker([lat, lng], makeOptions(style)).addTo(layer);
          namedMarkers.set(key, marker);
        }
      },
      setPolygon: (layerId, polygonId, points, style) => {
        const key = `${layerId}:${polygonId}`;
        const latLngs = points.map((point) => [point.lat, point.lng] as [number, number]);
        const existing = namedPolygons.get(key);
        if (existing) {
          existing.setLatLngs(latLngs);
          existing.setStyle(makePolygonOptions(style));
          return;
        }

        const layer = getOrCreateLayer(layerId);
        const polygon = L.polygon(latLngs, makePolygonOptions(style)).addTo(layer);
        polygon.on('click', () => {
          const handlers = polygonClickHandlers.get(layerId);
          handlers?.forEach((handler) => handler(polygonId));
        });
        namedPolygons.set(key, polygon);
      },
      removePolygon: (layerId, polygonId) => {
        const key = `${layerId}:${polygonId}`;
        const polygon = namedPolygons.get(key);
        if (!polygon) {
          return;
        }
        const layer = pluginLayers.get(layerId);
        if (layer?.hasLayer(polygon)) {
          layer.removeLayer(polygon);
        } else {
          polygon.remove();
        }
        namedPolygons.delete(key);
      },
      setPolyline: (layerId, lineId, points, style) => {
        const key = `${layerId}:${lineId}`;
        const latLngs = points.map((p) => [p.lat, p.lng] as [number, number]);
        const options = {
          color: style?.color ?? '#e67e22',
          weight: style?.weight ?? 2,
          dashArray: style?.dashArray,
          opacity: style?.opacity ?? 1,
        };
        const existing = namedPolylines.get(key);
        if (existing) {
          existing.setLatLngs(latLngs);
          existing.setStyle(options);
          return;
        }
        const layer = getOrCreateLayer(layerId);
        const polyline = L.polyline(latLngs, options).addTo(layer);
        namedPolylines.set(key, polyline);
      },
      removePolyline: (layerId, lineId) => {
        const key = `${layerId}:${lineId}`;
        const polyline = namedPolylines.get(key);
        if (!polyline) {
          return;
        }
        const layer = pluginLayers.get(layerId);
        if (layer?.hasLayer(polyline)) {
          layer.removeLayer(polyline);
        } else {
          polyline.remove();
        }
        namedPolylines.delete(key);
      },
      removeCircleMarker: (layerId, markerId) => {
        const key = `${layerId}:${markerId}`;
        const marker = namedMarkers.get(key);
        if (!marker) {
          return;
        }
        const layer = pluginLayers.get(layerId);
        if (layer?.hasLayer(marker)) {
          layer.removeLayer(marker);
        } else {
          marker.remove();
        }
        namedMarkers.delete(key);
      },
      registerMapMouseMove: (handler) => {
        mapMouseMoveHandlers.add(handler);
        return () => {
          mapMouseMoveHandlers.delete(handler);
        };
      },
      registerMapClick: (handler) => {
        mapClickHandlers.add(handler);
        return () => {
          mapClickHandlers.delete(handler);
        };
      },
      registerMapDoubleClick: (handler) => {
        mapDoubleClickHandlers.add(handler);
        return () => {
          mapDoubleClickHandlers.delete(handler);
        };
      },
      registerPolygonClick: (layerId, handler) => {
        if (!polygonClickHandlers.has(layerId)) {
          polygonClickHandlers.set(layerId, new Set());
        }
        polygonClickHandlers.get(layerId)!.add(handler);
        return () => {
          polygonClickHandlers.get(layerId)?.delete(handler);
        };
      },
      registerDialog: (id, title): MapDialog => {
        // Registrar diálogo en el estado (oculto por defecto)
        this.dialogs.update((list) => {
          const existing = list.find((dialog) => dialog.id === id);
          if (existing) {
            return list;
          }
          const entry: DialogEntry = {
            id,
            title,
            visible: false,
            content: this.sanitizer.bypassSecurityTrustHtml(''),
            x: 80,
            y: 80,
          };
          return [...list, entry];
        });
        return {
          setContent: (html: string) => {
            const safe = this.sanitizer.bypassSecurityTrustHtml(html);
            this.dialogs.update((list) =>
              list.map((d) => (d.id === id ? { ...d, content: safe } : d)),
            );
          },
        };
      },
      toggleDialog: (id) => {
        this.dialogs.update((list) =>
          list.map((d) => (d.id === id ? { ...d, visible: !d.visible } : d)),
        );
      },
      showDialog: (id) => {
        this.dialogs.update((list) =>
          list.map((d) => (d.id === id ? { ...d, visible: true } : d)),
        );
      },
    };

    loadRemote<{ menuItems: MenuButton[] }>('plugin_tracks/MenuItems')
      .then((mod) => {
        if (mod?.menuItems) {
          this.menuButtons.update((list) => [...list, ...mod.menuItems]);
        }
      })
      .catch(() => {
        console.warn('plugin_tracks/MenuItems no disponible');
      });

    loadRemote<{ layerItems: LayerItem[] }>('plugin_tracks/LayerItems')
      .then((mod) => {
        mod?.layerItems?.forEach((item) => item.init(this.mapContext!));
      })
      .catch(() => {
        console.warn('plugin_tracks/LayerItems no disponible');
      });

    loadRemote<{ menuItems: MenuButton[] }>('plugin_tactical_objects/MenuItems')
      .then((mod) => {
        if (mod?.menuItems) {
          this.menuButtons.update((list) => [...list, ...mod.menuItems]);
        }
      })
      .catch(() => {
        console.warn('plugin_tactical_objects/MenuItems no disponible');
      });

    loadRemote<{ layerItems: LayerItem[] }>('plugin_tactical_objects/LayerItems')
      .then((mod) => {
        mod?.layerItems?.forEach((item) => item.init(this.mapContext!));
      })
      .catch(() => {
        console.warn('plugin_tactical_objects/LayerItems no disponible');
      });

    // Load plugin_alarms
    console.log('[Shell] Loading plugin_alarms...');
    loadRemote<any>('plugin_alarms/Routes')
      .then((mod) => {
        console.log('[Shell] plugin_alarms loaded, module keys:', Object.keys(mod || {}));
        const initFunc = mod?.initializeAlarmsPlugin;
        if (initFunc && typeof initFunc === 'function') {
          console.log('[Shell] Initializing alarms plugin...');
          initFunc(this.appRef, this.injector, this.ngZone);
          console.log('[Shell] Alarms plugin initialized');
        } else {
          console.warn('[Shell] initializeAlarmsPlugin not found or not a function');
        }
      })
      .catch((err) => {
        console.warn('[Shell] plugin_alarms no disponible o no se pudo cargar', err);
      });
  }
}

