import * as L from 'leaflet';
import {
  CircleMarkerStyle,
  MapContextBootstrapConfig,
  MapContextFactory,
  MapContext,
  MapPoint,
  PolygonStyle,
  PolylineStyle,
} from '@mi-sistema-plugins/common-map';

/**
 * Monta un mapa Leaflet en el elemento DOM indicado y devuelve
 * la implementación de MapContext basada en Leaflet.
 *
 * Encapsula toda la lógica de Leaflet para que el shell no dependa
 * directamente de la librería de mapas.
 */
function addLeafletBaseLayer(map: L.Map, config: MapContextBootstrapConfig): void {
  if (config.baseLayer.type === 'wms') {
    L.tileLayer.wms(config.baseLayer.url, {
      layers: config.baseLayer.layers,
      format: config.baseLayer.format ?? 'image/png',
      transparent: config.baseLayer.transparent ?? false,
      attribution: config.baseLayer.attribution,
    }).addTo(map);
    return;
  }

  L.tileLayer(config.baseLayer.url, {
    attribution: config.baseLayer.attribution,
  }).addTo(map);
}

export const leafletMapContextFactory: MapContextFactory = (elementId, config): MapContext => {
  const map = L.map(elementId, {
    center: config.view.center,
    zoom: config.view.zoom,
    minZoom: config.view.minZoom ?? 2,
    zoomControl: true,
    doubleClickZoom: false,
  });

  addLeafletBaseLayer(map, config);

  const layersControl = L.control.layers({}, {}, { collapsed: false }).addTo(map);
  const pluginLayers = new Map<string, L.LayerGroup>();
  const namedMarkers = new Map<string, L.CircleMarker>();
  const namedPolygons = new Map<string, L.Polygon>();
  const namedPolylines = new Map<string, L.Polyline>();
  const mapClickHandlers = new Set<(point: MapPoint) => void>();
  const mapDoubleClickHandlers = new Set<(point: MapPoint) => void>();
  const mapMouseMoveHandlers = new Set<(point: MapPoint) => void>();
  const polygonClickHandlers = new Map<string, Set<(polygonId: string) => void>>();

  const getOrCreateLayer = (layerId: string): L.LayerGroup => {
    let layer = pluginLayers.get(layerId);
    if (!layer) {
      layer = L.layerGroup().addTo(map);
      pluginLayers.set(layerId, layer);
    }
    return layer;
  };

  const makeMarkerOptions = (style?: CircleMarkerStyle): L.CircleMarkerOptions => ({
    radius: style?.radius ?? 8,
    color: style?.color ?? '#003399',
    fillColor: style?.fillColor ?? '#3399ff',
    fillOpacity: style?.fillOpacity ?? 0.8,
  });

  const makePolygonOptions = (style?: PolygonStyle): L.PathOptions => ({
    color: style?.color ?? '#d35400',
    fillColor: style?.fillColor ?? '#f39c12',
    fillOpacity: style?.fillOpacity ?? 0.25,
    weight: style?.weight ?? 2,
    dashArray: style?.dashArray,
  });

  const makePolylineOptions = (style?: PolylineStyle): L.PolylineOptions => ({
    color: style?.color ?? '#e67e22',
    weight: style?.weight ?? 2,
    dashArray: style?.dashArray,
    opacity: style?.opacity ?? 1,
  });

  // Delay single-click to distinguish from double-click
  let pendingClick: ReturnType<typeof setTimeout> | null = null;

  map.on('click', (event) => {
    const point: MapPoint = { lat: event.latlng.lat, lng: event.latlng.lng };
    if (mapDoubleClickHandlers.size > 0) {
      if (pendingClick !== null) clearTimeout(pendingClick);
      pendingClick = setTimeout(() => {
        pendingClick = null;
        mapClickHandlers.forEach((h) => h(point));
      }, 250);
    } else {
      mapClickHandlers.forEach((h) => h(point));
    }
  });

  map.on('dblclick', (event) => {
    if (pendingClick !== null) {
      clearTimeout(pendingClick);
      pendingClick = null;
    }
    const point: MapPoint = { lat: event.latlng.lat, lng: event.latlng.lng };
    mapDoubleClickHandlers.forEach((h) => h(point));
  });

  map.on('mousemove', (event) => {
    const point: MapPoint = { lat: event.latlng.lat, lng: event.latlng.lng };
    mapMouseMoveHandlers.forEach((h) => h(point));
  });

  return {
    registerLayer: (layerId, displayName) => {
      const layer = getOrCreateLayer(layerId);
      layersControl.addOverlay(layer, displayName);
    },

    addCircleMarker: (layerId, lat, lng, style) => {
      const layer = getOrCreateLayer(layerId);
      L.circleMarker([lat, lng], makeMarkerOptions(style)).addTo(layer);
    },

    setCircleMarker: (layerId, markerId, lat, lng, style) => {
      const key = `${layerId}:${markerId}`;
      const existing = namedMarkers.get(key);
      if (existing) {
        existing.setLatLng([lat, lng]);
      } else {
        const layer = getOrCreateLayer(layerId);
        namedMarkers.set(key, L.circleMarker([lat, lng], makeMarkerOptions(style)).addTo(layer));
      }
    },

    setPolygon: (layerId, polygonId, points, style) => {
      const key = `${layerId}:${polygonId}`;
      const latLngs = points.map((p) => [p.lat, p.lng] as [number, number]);
      const existing = namedPolygons.get(key);
      if (existing) {
        existing.setLatLngs(latLngs);
        existing.setStyle(makePolygonOptions(style));
        return;
      }
      const layer = getOrCreateLayer(layerId);
      const polygon = L.polygon(latLngs, makePolygonOptions(style)).addTo(layer);
      polygon.on('click', () => {
        polygonClickHandlers.get(layerId)?.forEach((h) => h(polygonId));
      });
      namedPolygons.set(key, polygon);
    },

    removePolygon: (layerId, polygonId) => {
      const key = `${layerId}:${polygonId}`;
      const polygon = namedPolygons.get(key);
      if (!polygon) return;
      const layer = pluginLayers.get(layerId);
      layer?.hasLayer(polygon) ? layer.removeLayer(polygon) : polygon.remove();
      namedPolygons.delete(key);
    },

    setPolyline: (layerId, lineId, points, style) => {
      const key = `${layerId}:${lineId}`;
      const latLngs = points.map((p) => [p.lat, p.lng] as [number, number]);
      const existing = namedPolylines.get(key);
      if (existing) {
        existing.setLatLngs(latLngs);
        existing.setStyle(makePolylineOptions(style));
        return;
      }
      const layer = getOrCreateLayer(layerId);
      namedPolylines.set(key, L.polyline(latLngs, makePolylineOptions(style)).addTo(layer));
    },

    removePolyline: (layerId, lineId) => {
      const key = `${layerId}:${lineId}`;
      const polyline = namedPolylines.get(key);
      if (!polyline) return;
      const layer = pluginLayers.get(layerId);
      layer?.hasLayer(polyline) ? layer.removeLayer(polyline) : polyline.remove();
      namedPolylines.delete(key);
    },

    removeCircleMarker: (layerId, markerId) => {
      const key = `${layerId}:${markerId}`;
      const marker = namedMarkers.get(key);
      if (!marker) return;
      const layer = pluginLayers.get(layerId);
      layer?.hasLayer(marker) ? layer.removeLayer(marker) : marker.remove();
      namedMarkers.delete(key);
    },

    registerMapMouseMove: (handler) => {
      mapMouseMoveHandlers.add(handler);
      return () => mapMouseMoveHandlers.delete(handler);
    },

    registerMapClick: (handler) => {
      mapClickHandlers.add(handler);
      return () => mapClickHandlers.delete(handler);
    },

    registerMapDoubleClick: (handler) => {
      mapDoubleClickHandlers.add(handler);
      return () => mapDoubleClickHandlers.delete(handler);
    },

    registerPolygonClick: (layerId, handler) => {
      if (!polygonClickHandlers.has(layerId)) {
        polygonClickHandlers.set(layerId, new Set());
      }
      polygonClickHandlers.get(layerId)!.add(handler);
      return () => polygonClickHandlers.get(layerId)?.delete(handler);
    },

    registerDialog: (id, title) => config.dialogs.registerDialog(id, title),
    toggleDialog: (id) => config.dialogs.toggleDialog(id),
    showDialog: (id) => config.dialogs.showDialog(id),
  };
};
