/** Opciones visuales para un marcador circular en el mapa. */
export interface CircleMarkerStyle {
  radius?: number;
  color?: string;
  fillColor?: string;
  fillOpacity?: number;
}

/** Coordenada geográfica simple. */
export interface MapPoint {
  lat: number;
  lng: number;
}

/** Opciones visuales para polígonos. */
export interface PolygonStyle {
  color?: string;
  fillColor?: string;
  fillOpacity?: number;
  weight?: number;
  dashArray?: string;
}

/** Opciones visuales para polilíneas. */
export interface PolylineStyle {
  color?: string;
  weight?: number;
  dashArray?: string;
  opacity?: number;
}

/**
 * Handle que el shell devuelve al registrar un diálogo flotante.
 * El plugin lo usa para actualizar el contenido en cualquier momento.
 */
export interface MapDialog {
  /** Actualiza el contenido HTML del cuerpo del diálogo. */
  setContent(html: string): void;
}

/**
 * Contexto del mapa que el shell proporciona a los plugins.
 * Permite interactuar con el mapa sin depender directamente de Leaflet.
 */
export interface MapContext {
  registerLayer(layerId: string, displayName: string): void;
  addCircleMarker(layerId: string, lat: number, lng: number, style?: CircleMarkerStyle): void;
  setCircleMarker(layerId: string, markerId: string, lat: number, lng: number, style?: CircleMarkerStyle): void;
  setPolygon(layerId: string, polygonId: string, points: MapPoint[], style?: PolygonStyle): void;
  removePolygon(layerId: string, polygonId: string): void;
  setPolyline(layerId: string, lineId: string, points: MapPoint[], style?: PolylineStyle): void;
  removePolyline(layerId: string, lineId: string): void;
  removeCircleMarker(layerId: string, markerId: string): void;
  registerMapMouseMove(handler: (point: MapPoint) => void): () => void;
  registerMapClick(handler: (point: MapPoint) => void): () => void;
  registerMapDoubleClick(handler: (point: MapPoint) => void): () => void;
  registerPolygonClick(layerId: string, handler: (polygonId: string) => void): () => void;
  registerDialog(id: string, title: string): MapDialog;
  toggleDialog(id: string): void;
  showDialog(id: string): void;
}

/** Elemento de capa que un plugin registra en el shell al arranque. */
export interface LayerItem {
  id: string;
  displayName: string;
  init(mapContext: MapContext): void;
}

/** Botón de menú que un plugin registra en el shell. */
export interface MenuButton {
  label: string;
  action: (mapContext?: MapContext) => void;
}
