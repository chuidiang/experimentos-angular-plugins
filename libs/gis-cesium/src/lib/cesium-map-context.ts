import {
  Cartesian2,
  Cartesian3,
  Color,
  createWorldTerrainAsync,
  Entity,
  HeightReference,
  Math as CesiumMath,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  UrlTemplateImageryProvider,
  Viewer,
  WebMapServiceImageryProvider,
} from 'cesium';
import {
  CircleMarkerStyle,
  MapContext,
  MapContextBootstrapConfig,
  MapContextFactory,
  MapPoint,
  PolygonStyle,
  PolylineStyle,
} from '@mi-sistema-plugins/common-map';

function parseColor(value: string | undefined, fallback: Color): Color {
  if (!value) return fallback;
  try {
    return Color.fromCssColorString(value);
  } catch {
    return fallback;
  }
}

function circleStyle(style?: CircleMarkerStyle): Required<CircleMarkerStyle> {
  return {
    radius: style?.radius ?? 8,
    color: style?.color ?? '#003399',
    fillColor: style?.fillColor ?? '#3399ff',
    fillOpacity: style?.fillOpacity ?? 0.8,
  };
}

function polygonStyle(style?: PolygonStyle): Required<Omit<PolygonStyle, 'dashArray'>> {
  return {
    color: style?.color ?? '#d35400',
    fillColor: style?.fillColor ?? '#f39c12',
    fillOpacity: style?.fillOpacity ?? 0.25,
    weight: style?.weight ?? 2,
  };
}

function lineStyle(style?: PolylineStyle): Required<Omit<PolylineStyle, 'dashArray'>> {
  return {
    color: style?.color ?? '#e67e22',
    weight: style?.weight ?? 2,
    opacity: style?.opacity ?? 1,
  };
}

function toDegreesArray(points: MapPoint[]): number[] {
  return points.flatMap((p) => [p.lng, p.lat]);
}

function tryGetPointFromScreen(viewer: Viewer, pos: Cartesian2): MapPoint | undefined {
  const ray = viewer.camera.getPickRay(pos);
  if (!ray) return undefined;
  const hit = viewer.scene.globe.pick(ray, viewer.scene);
  if (!hit) return undefined;
  const cartographic = viewer.scene.globe.ellipsoid.cartesianToCartographic(hit);
  if (!cartographic) return undefined;
  return {
    lat: CesiumMath.toDegrees(cartographic.latitude),
    lng: CesiumMath.toDegrees(cartographic.longitude),
  };
}

async function configureBaseLayer(viewer: Viewer, config: MapContextBootstrapConfig): Promise<void> {
  viewer.imageryLayers.removeAll();
  if (config.baseLayer.type === 'wms') {
    viewer.imageryLayers.addImageryProvider(
      new WebMapServiceImageryProvider({
        url: config.baseLayer.url,
        layers: config.baseLayer.layers,
        parameters: {
          transparent: (config.baseLayer.transparent ?? false).toString(),
          format: config.baseLayer.format ?? 'image/png',
        },
      })
    );
    return;
  }

  viewer.imageryLayers.addImageryProvider(
    new UrlTemplateImageryProvider({
      url: config.baseLayer.url,
    })
  );
}

function createControlsRoot(mapElement: HTMLElement): HTMLDivElement {
  const root = document.createElement('div');
  root.style.position = 'absolute';
  root.style.top = '12px';
  root.style.left = '12px';
  root.style.zIndex = '1200';
  root.style.display = 'flex';
  root.style.flexDirection = 'column';
  root.style.gap = '8px';
  root.style.pointerEvents = 'auto';
  mapElement.appendChild(root);
  return root;
}

function createPanel(title: string): HTMLDivElement {
  const panel = document.createElement('div');
  panel.style.background = 'rgba(255,255,255,0.94)';
  panel.style.border = '1px solid #aab3bc';
  panel.style.borderRadius = '6px';
  panel.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
  panel.style.padding = '8px';
  panel.style.minWidth = '148px';

  const heading = document.createElement('div');
  heading.textContent = title;
  heading.style.fontSize = '12px';
  heading.style.fontWeight = '700';
  heading.style.marginBottom = '6px';
  heading.style.color = '#2a3a4a';
  panel.appendChild(heading);

  return panel;
}

function createZoomControls(viewer: Viewer): HTMLDivElement {
  const panel = createPanel('Zoom');
  const row = document.createElement('div');
  row.style.display = 'flex';
  row.style.gap = '6px';

  const createButton = (label: string, onClick: () => void): HTMLButtonElement => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    btn.style.width = '32px';
    btn.style.height = '28px';
    btn.style.border = '1px solid #95a0aa';
    btn.style.borderRadius = '4px';
    btn.style.background = '#ffffff';
    btn.style.cursor = 'pointer';
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      onClick();
    });
    return btn;
  };

  const step = (): number => Math.max(viewer.camera.positionCartographic.height * 0.2, 1_000);
  row.appendChild(createButton('+', () => viewer.camera.zoomIn(step())));
  row.appendChild(createButton('-', () => viewer.camera.zoomOut(step())));
  panel.appendChild(row);
  return panel;
}

function buildLayerControls(
  layerDisplayNames: Map<string, string>,
  layerVisibility: Map<string, boolean>,
  onVisibilityChange: (layerId: string, visible: boolean) => void
): HTMLDivElement {
  const panel = createPanel('Capas');
  const list = document.createElement('div');
  list.style.display = 'flex';
  list.style.flexDirection = 'column';
  list.style.gap = '4px';
  list.style.maxHeight = '220px';
  list.style.overflow = 'auto';
  panel.appendChild(list);

  const render = (): void => {
    list.innerHTML = '';
    Array.from(layerDisplayNames.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .forEach(([layerId, displayName]) => {
        const row = document.createElement('label');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '6px';
        row.style.fontSize = '12px';
        row.style.color = '#203040';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = layerVisibility.get(layerId) ?? true;
        checkbox.addEventListener('change', (ev) => {
          ev.stopPropagation();
          const visible = checkbox.checked;
          layerVisibility.set(layerId, visible);
          onVisibilityChange(layerId, visible);
        });

        const text = document.createElement('span');
        text.textContent = displayName;

        row.appendChild(checkbox);
        row.appendChild(text);
        list.appendChild(row);
      });

    if (layerDisplayNames.size === 0) {
      const empty = document.createElement('div');
      empty.textContent = 'Sin capas registradas';
      empty.style.fontSize = '12px';
      empty.style.color = '#65707a';
      list.appendChild(empty);
    }
  };

  render();
  (panel as HTMLDivElement & { refresh?: () => void }).refresh = render;
  return panel;
}

export const cesiumMapContextFactory: MapContextFactory = (elementId, config): MapContext => {
  (window as unknown as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = '/assets/cesium';

  const viewer = new Viewer(elementId, {
    animation: false,
    timeline: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    baseLayerPicker: false,
    navigationHelpButton: false,
    infoBox: false,
    selectionIndicator: false,
    fullscreenButton: false,
  });

  void configureBaseLayer(viewer, config);
  void createWorldTerrainAsync().then((terrain) => {
    viewer.terrainProvider = terrain;
  });

  viewer.camera.setView({
    destination: Cartesian3.fromDegrees(config.view.center[1], config.view.center[0], 15_000_000),
  });

  const pluginLayers = new Map<string, string>();
  const layerDisplayNames = new Map<string, string>();
  const layerVisibility = new Map<string, boolean>();
  const layerEntities = new Map<string, Set<Entity>>();
  const namedMarkers = new Map<string, Entity>();
  const namedPolygons = new Map<string, Entity>();
  const namedPolylines = new Map<string, Entity>();
  const polygonOwner = new Map<string, { layerId: string; polygonId: string }>();
  const mapClickHandlers = new Set<(point: MapPoint) => void>();
  const mapDoubleClickHandlers = new Set<(point: MapPoint) => void>();
  const mapMouseMoveHandlers = new Set<(point: MapPoint) => void>();
  const polygonClickHandlers = new Map<string, Set<(polygonId: string) => void>>();

  const mapElement = document.getElementById(elementId);
  const controlsRoot = mapElement ? createControlsRoot(mapElement) : undefined;
  if (controlsRoot) {
    controlsRoot.appendChild(createZoomControls(viewer));
  }

  const applyLayerVisibility = (layerId: string, visible: boolean): void => {
    const entities = layerEntities.get(layerId);
    if (!entities) return;
    entities.forEach((entity) => {
      entity.show = visible;
    });
  };

  const layersPanel = buildLayerControls(layerDisplayNames, layerVisibility, applyLayerVisibility) as
    HTMLDivElement & { refresh?: () => void };
  if (controlsRoot) {
    controlsRoot.appendChild(layersPanel);
  }

  const ensureLayer = (layerId: string, displayName?: string): void => {
    if (!pluginLayers.has(layerId)) {
      pluginLayers.set(layerId, layerId);
    }
    if (!layerDisplayNames.has(layerId)) {
      layerDisplayNames.set(layerId, displayName ?? layerId);
    } else if (displayName) {
      layerDisplayNames.set(layerId, displayName);
    }
    if (!layerVisibility.has(layerId)) {
      layerVisibility.set(layerId, true);
    }
    if (!layerEntities.has(layerId)) {
      layerEntities.set(layerId, new Set());
    }
  };

  const addEntityToLayer = (layerId: string, entity: Entity): void => {
    ensureLayer(layerId);
    const entities = layerEntities.get(layerId)!;
    entities.add(entity);
    entity.show = layerVisibility.get(layerId) ?? true;
  };

  const removeEntityFromLayer = (layerId: string, entity: Entity): void => {
    layerEntities.get(layerId)?.delete(entity);
  };

  const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
  handler.setInputAction((movement: { position: Cartesian2 }) => {
    const point = tryGetPointFromScreen(viewer, movement.position);
    if (!point) return;
    const picked = viewer.scene.pick(movement.position);
    const entity = picked?.id as Entity | undefined;
    if (entity?.id && polygonOwner.has(entity.id)) {
      const owner = polygonOwner.get(entity.id)!;
      polygonClickHandlers.get(owner.layerId)?.forEach((h) => h(owner.polygonId));
    }
    mapClickHandlers.forEach((h) => h(point));
  }, ScreenSpaceEventType.LEFT_CLICK);

  handler.setInputAction((movement: { position: Cartesian2 }) => {
    const point = tryGetPointFromScreen(viewer, movement.position);
    if (!point) return;
    mapDoubleClickHandlers.forEach((h) => h(point));
  }, ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

  handler.setInputAction((movement: { endPosition: Cartesian2 }) => {
    const point = tryGetPointFromScreen(viewer, movement.endPosition);
    if (!point) return;
    mapMouseMoveHandlers.forEach((h) => h(point));
  }, ScreenSpaceEventType.MOUSE_MOVE);

  return {
    registerLayer: (layerId, displayName) => {
      ensureLayer(layerId, displayName);
      layersPanel.refresh?.();
    },
    addCircleMarker: (layerId, lat, lng, style) => {
      ensureLayer(layerId);
      const cfg = circleStyle(style);
      const entity = viewer.entities.add({
        position: Cartesian3.fromDegrees(lng, lat),
        point: {
          pixelSize: cfg.radius * 2,
          color: parseColor(cfg.fillColor, Color.CORNFLOWERBLUE).withAlpha(cfg.fillOpacity),
          outlineColor: parseColor(cfg.color, Color.DARKBLUE),
          outlineWidth: 1,
          heightReference: HeightReference.CLAMP_TO_GROUND,
        },
      });
      addEntityToLayer(layerId, entity);
    },
    setCircleMarker: (layerId, markerId, lat, lng, style) => {
      ensureLayer(layerId);
      const key = `${layerId}:${markerId}`;
      const cfg = circleStyle(style);
      const existing = namedMarkers.get(key);
      if (existing) {
        viewer.entities.remove(existing);
        removeEntityFromLayer(layerId, existing);
      }
      const entity = viewer.entities.add({
        id: key,
        position: Cartesian3.fromDegrees(lng, lat),
        point: {
          pixelSize: cfg.radius * 2,
          color: parseColor(cfg.fillColor, Color.CORNFLOWERBLUE).withAlpha(cfg.fillOpacity),
          outlineColor: parseColor(cfg.color, Color.DARKBLUE),
          outlineWidth: 1,
          heightReference: HeightReference.CLAMP_TO_GROUND,
        },
      });
      namedMarkers.set(key, entity);
      addEntityToLayer(layerId, entity);
    },
    setPolygon: (layerId, polygonId, points, style) => {
      ensureLayer(layerId);
      const key = `${layerId}:${polygonId}`;
      const cfg = polygonStyle(style);
      const hierarchy = Cartesian3.fromDegreesArray(toDegreesArray(points));
      const existing = namedPolygons.get(key);
      if (existing) {
        viewer.entities.remove(existing);
        removeEntityFromLayer(layerId, existing);
      }
      const entity = viewer.entities.add({
        id: key,
        polygon: {
          hierarchy,
          material: parseColor(cfg.fillColor, Color.ORANGE).withAlpha(cfg.fillOpacity),
          outline: true,
          outlineColor: parseColor(cfg.color, Color.DARKORANGE),
          perPositionHeight: false,
        },
      });
      namedPolygons.set(key, entity);
      polygonOwner.set(key, { layerId, polygonId });
      addEntityToLayer(layerId, entity);
    },
    removePolygon: (layerId, polygonId) => {
      const key = `${layerId}:${polygonId}`;
      const entity = namedPolygons.get(key);
      if (!entity) return;
      viewer.entities.remove(entity);
      removeEntityFromLayer(layerId, entity);
      namedPolygons.delete(key);
      polygonOwner.delete(key);
    },
    setPolyline: (layerId, lineId, points, style) => {
      ensureLayer(layerId);
      const key = `${layerId}:${lineId}`;
      const cfg = lineStyle(style);
      const positions = Cartesian3.fromDegreesArray(toDegreesArray(points));
      const existing = namedPolylines.get(key);
      if (existing) {
        viewer.entities.remove(existing);
        removeEntityFromLayer(layerId, existing);
      }
      const entity = viewer.entities.add({
        id: key,
        polyline: {
          positions,
          width: cfg.weight,
          material: parseColor(cfg.color, Color.DARKORANGE).withAlpha(cfg.opacity),
          clampToGround: true,
        },
      });
      namedPolylines.set(key, entity);
      addEntityToLayer(layerId, entity);
    },
    removePolyline: (layerId, lineId) => {
      const key = `${layerId}:${lineId}`;
      const entity = namedPolylines.get(key);
      if (!entity) return;
      viewer.entities.remove(entity);
      removeEntityFromLayer(layerId, entity);
      namedPolylines.delete(key);
    },
    removeCircleMarker: (layerId, markerId) => {
      const key = `${layerId}:${markerId}`;
      const entity = namedMarkers.get(key);
      if (!entity) return;
      viewer.entities.remove(entity);
      removeEntityFromLayer(layerId, entity);
      namedMarkers.delete(key);
    },
    registerMapMouseMove: (handlerFn) => {
      mapMouseMoveHandlers.add(handlerFn);
      return () => mapMouseMoveHandlers.delete(handlerFn);
    },
    registerMapClick: (handlerFn) => {
      mapClickHandlers.add(handlerFn);
      return () => mapClickHandlers.delete(handlerFn);
    },
    registerMapDoubleClick: (handlerFn) => {
      mapDoubleClickHandlers.add(handlerFn);
      return () => mapDoubleClickHandlers.delete(handlerFn);
    },
    registerPolygonClick: (layerId, handlerFn) => {
      if (!polygonClickHandlers.has(layerId)) {
        polygonClickHandlers.set(layerId, new Set());
      }
      polygonClickHandlers.get(layerId)!.add(handlerFn);
      return () => polygonClickHandlers.get(layerId)?.delete(handlerFn);
    },
    registerDialog: (id, title) => config.dialogs.registerDialog(id, title),
    toggleDialog: (id) => config.dialogs.toggleDialog(id),
    showDialog: (id) => config.dialogs.showDialog(id),
  };
};
