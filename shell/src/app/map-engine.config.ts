import { MapContextFactory, MapEngineOptions } from '@mi-sistema-plugins/common-map';
// import { leafletMapContextFactory } from '@mi-sistema-plugins/gis-leaflet';
import { cesiumMapContextFactory } from '@mi-sistema-plugins/gis-cesium';

// Cambiar de motor GIS requiere editar solo este fichero:
// - Import de factoria (gis-cesium o gis-leaflet)
// - Configuracion de capa base
// export const shellMapContextFactory: MapContextFactory = leafletMapContextFactory;
export const shellMapContextFactory: MapContextFactory = cesiumMapContextFactory;

export const shellMapEngineOptions: MapEngineOptions = {
  view: {
    center: [20, 0],
    zoom: 2,
    minZoom: 2,
  },
  baseLayer: {
    type: 'xyz',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
};
