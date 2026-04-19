import { MapContext } from '@mi-sistema-plugins/common-map';

/**
 * Crea una implementación stub de MapContext basada en Cesium.
 * Pendiente de implementación real cuando se integre la librería CesiumJS.
 */
export function createCesiumMapContext(): MapContext {
  const notImplemented =
    (method: string) =>
    (..._args: unknown[]): never => {
      throw new Error(`CesiumMapContext.${method} is not yet implemented`);
    };

  return {
    registerLayer: notImplemented('registerLayer'),
    addCircleMarker: notImplemented('addCircleMarker'),
    setCircleMarker: notImplemented('setCircleMarker'),
    setPolygon: notImplemented('setPolygon'),
    removePolygon: notImplemented('removePolygon'),
    setPolyline: notImplemented('setPolyline'),
    removePolyline: notImplemented('removePolyline'),
    removeCircleMarker: notImplemented('removeCircleMarker'),
    registerMapMouseMove: notImplemented('registerMapMouseMove'),
    registerMapClick: notImplemented('registerMapClick'),
    registerMapDoubleClick: notImplemented('registerMapDoubleClick'),
    registerPolygonClick: notImplemented('registerPolygonClick'),
    registerDialog: notImplemented('registerDialog'),
    toggleDialog: notImplemented('toggleDialog'),
    showDialog: notImplemented('showDialog'),
  };
}
