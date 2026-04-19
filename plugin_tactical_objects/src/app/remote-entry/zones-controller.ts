import { MapContext, MapDialog, MapPoint } from '@mi-sistema-plugins/common-map';
import {
  TacticalZone,
  TacticalZoneEvents,
} from '@mi-sistema-plugins/tactical-zones-domain';

const LAYER_ID = 'tactical-zones';
const DIALOG_ID = 'zones-panel';

const ZONE_STYLE = { color: '#b23a48', fillColor: '#f4a261', fillOpacity: 0.25, weight: 2 };
const DRAFT_LINE_STYLE = { color: '#e67e22', weight: 2, dashArray: '6 4' };
const RUBBER_STYLE = { color: '#e67e22', weight: 1, dashArray: '3 5', opacity: 0.7 };
const VERTEX_STYLE = { radius: 5, color: '#c0392b', fillColor: '#e74c3c', fillOpacity: 1 };

const DRAFT_LINE_ID = '__draft_line__';
const DRAFT_RUBBER_ID = '__draft_rubber__';
const draftVertexId = (i: number) => `__draft_vtx_${i}__`;

const START_CREATE_HANDLER = '__tacticalZonesStartCreate';
const CANCEL_DRAFT_HANDLER = '__tacticalZonesCancelDraft';
const DELETE_ZONE_HANDLER = '__tacticalZonesDeleteZone';
const NAME_INPUT_ID = 'zones-new-name-input';

interface TacticalZoneWindow extends Window {
  [START_CREATE_HANDLER]?: (name: string) => void;
  [CANCEL_DRAFT_HANDLER]?: () => void;
  [DELETE_ZONE_HANDLER]?: (zoneId: string) => void;
}

const zones: TacticalZone[] = [];

let mapContextRef: MapContext | undefined;
let dialog: MapDialog | undefined;

let unsubClick: (() => void) | undefined;
let unsubDblClick: (() => void) | undefined;
let unsubMouseMove: (() => void) | undefined;
let unsubPolygonClick: (() => void) | undefined;

let drawing = false;
let draftName = '';
let draftPoints: MapPoint[] = [];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function deleteZone(zoneId: string): void {
  if (!mapContextRef) {
    return;
  }
  const idx = zones.findIndex((zone) => zone.id === zoneId);
  if (idx < 0) {
    return;
  }
  const [removedZone] = zones.splice(idx, 1);
  mapContextRef.removePolygon(LAYER_ID, zoneId);
  TacticalZoneEvents.emitDeleted(removedZone);
  updateDialog();
}

function renderZonesTable(data: TacticalZone[]): string {
  const rows = data
    .map(
      (zone) =>
        `<tr>
          <td>${escapeHtml(zone.name)}</td>
          <td>${zone.points.length}</td>
          <td>
            <button type="button" class="zones-btn zones-btn--danger" onclick="window.${DELETE_ZONE_HANDLER} && window.${DELETE_ZONE_HANDLER}('${escapeHtml(zone.id)}')">Borrar</button>
          </td>
        </tr>`,
    )
    .join('');

  const modeText = drawing
    ? `<div class="zones-help zones-help--active">
        Dibujando: <strong>${escapeHtml(draftName)}</strong> (${draftPoints.length} vertices). Click para anadir vertice y doble click para cerrar.
      </div>`
    : '<div class="zones-help">Pulsa Nueva zona para comenzar el dibujo.</div>';

  const toolbar = drawing
    ? `<div class="zones-toolbar">
        <button type="button" class="zones-btn zones-btn--secondary" onclick="window.${CANCEL_DRAFT_HANDLER} && window.${CANCEL_DRAFT_HANDLER}()">Cancelar dibujo</button>
      </div>`
    : `<div class="zones-toolbar">
        <input id="${NAME_INPUT_ID}" type="text" class="zones-input" placeholder="Nombre de la zona" />
        <button type="button" class="zones-btn zones-btn--primary" onclick="window.${START_CREATE_HANDLER} && window.${START_CREATE_HANDLER}(((document.getElementById('${NAME_INPUT_ID}') && document.getElementById('${NAME_INPUT_ID}').value) || ''))">Nueva zona</button>
      </div>`;

  return `
    <style>
      .zones-toolbar { display:flex; gap:8px; margin-bottom:8px; }
      .zones-input { flex:1; min-width:140px; border:1px solid #ccc; border-radius:4px; padding:6px 8px; font-size:12px; }
      .zones-btn { border:0; border-radius:4px; padding:6px 10px; font-size:12px; cursor:pointer; }
      .zones-btn--primary { background:#b23a48; color:#fff; }
      .zones-btn--secondary { background:#888; color:#fff; }
      .zones-btn--danger { background:#d9534f; color:#fff; }
      .zones-tbl { width:100%; border-collapse:collapse; font-size:13px; }
      .zones-tbl th, .zones-tbl td { padding:4px 8px; text-align:left; border-bottom:1px solid #e0e0e0; }
      .zones-tbl th { background:#f4f4f4; font-weight:600; }
      .zones-help { margin-bottom:8px; font-size:12px; color:#555; padding:6px; background:#fafafa; border-radius:4px; }
      .zones-help--active { background:#fff3e0; color:#8a4b00; border-left:3px solid #e67e22; }
    </style>
    ${toolbar}
    ${modeText}
    <table class="zones-tbl">
      <thead><tr><th>Nombre</th><th>Vertices</th><th>Acciones</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="3" style="color:#aaa;font-style:italic">Sin zonas</td></tr>'}</tbody>
    </table>`;
}

function updateDialog(): void {
  dialog?.setContent(renderZonesTable(zones));
}

function clearDraftVisuals(): void {
  if (!mapContextRef) {
    return;
  }
  mapContextRef.removePolyline(LAYER_ID, DRAFT_LINE_ID);
  mapContextRef.removePolyline(LAYER_ID, DRAFT_RUBBER_ID);
  for (let i = 0; i < draftPoints.length; i++) {
    mapContextRef.removeCircleMarker(LAYER_ID, draftVertexId(i));
  }
}

function updateDraftVisuals(mousePoint?: MapPoint): void {
  if (!mapContextRef) {
    return;
  }

  if (draftPoints.length >= 2) {
    mapContextRef.setPolyline(LAYER_ID, DRAFT_LINE_ID, draftPoints, DRAFT_LINE_STYLE);
  } else {
    mapContextRef.removePolyline(LAYER_ID, DRAFT_LINE_ID);
  }

  draftPoints.forEach((point, i) => {
    mapContextRef!.setCircleMarker(LAYER_ID, draftVertexId(i), point.lat, point.lng, VERTEX_STYLE);
  });

  if (mousePoint && draftPoints.length > 0) {
    mapContextRef.setPolyline(
      LAYER_ID,
      DRAFT_RUBBER_ID,
      [draftPoints[draftPoints.length - 1], mousePoint],
      RUBBER_STYLE,
    );
  } else {
    mapContextRef.removePolyline(LAYER_ID, DRAFT_RUBBER_ID);
  }
}

function resetDraft(): void {
  clearDraftVisuals();
  drawing = false;
  draftName = '';
  draftPoints = [];
}

function startCreateFlow(rawName: string): void {
  if (drawing) {
    return;
  }
  const name = rawName?.trim();
  if (!name) {
    window.alert('Debes indicar un nombre para la nueva zona.');
    return;
  }
  drawing = true;
  draftName = name;
  draftPoints = [];
  updateDialog();
}

function isSamePoint(a: MapPoint, b: MapPoint): boolean {
  const tolerance = 1e-10;
  return Math.abs(a.lat - b.lat) < tolerance && Math.abs(a.lng - b.lng) < tolerance;
}

function finishDrawing(): void {
  if (!mapContextRef) {
    return;
  }

  if (draftPoints.length < 3) {
    window.alert('Un poligono necesita al menos 3 vertices.');
    return;
  }

  const zoneId = `zone-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const points = [...draftPoints];
  const zone: TacticalZone = { id: zoneId, name: draftName, points };
  zones.push(zone);

  clearDraftVisuals();
  mapContextRef.setPolygon(LAYER_ID, zoneId, points, ZONE_STYLE);
  TacticalZoneEvents.emitCreated(zone);

  drawing = false;
  draftName = '';
  draftPoints = [];
  updateDialog();
}

function bindDialogActions(): void {
  const globalWindow = window as TacticalZoneWindow;
  globalWindow[START_CREATE_HANDLER] = startCreateFlow;
  globalWindow[CANCEL_DRAFT_HANDLER] = () => {
    resetDraft();
    updateDialog();
  };
  globalWindow[DELETE_ZONE_HANDLER] = (zoneId: string) => {
    deleteZone(zoneId);
  };
}

function onPolygonClicked(polygonId: string): void {
  const zone = zones.find((item) => item.id === polygonId);
  if (!zone) {
    return;
  }
  const newName = window.prompt('Nuevo nombre de la zona', zone.name);
  if (newName?.trim()) {
    zone.name = newName.trim();
    TacticalZoneEvents.emitUpdated(zone);
    updateDialog();
  }
}

export function initZonesLayer(mapContext: MapContext): void {
  unsubClick?.();
  unsubDblClick?.();
  unsubMouseMove?.();
  unsubPolygonClick?.();

  mapContextRef = mapContext;

  mapContext.registerLayer(LAYER_ID, 'Tactical zones');
  dialog = mapContext.registerDialog(DIALOG_ID, 'Zones');
  bindDialogActions();
  updateDialog();

  unsubClick = mapContext.registerMapClick((point) => {
    if (!drawing) {
      return;
    }
    draftPoints = [...draftPoints, point];
    updateDraftVisuals();
    updateDialog();
  });

  unsubDblClick = mapContext.registerMapDoubleClick((point) => {
    if (!drawing) {
      return;
    }

    const lastPoint = draftPoints[draftPoints.length - 1];
    if (!lastPoint || !isSamePoint(lastPoint, point)) {
      draftPoints = [...draftPoints, point];
    }

    finishDrawing();
  });

  unsubMouseMove = mapContext.registerMapMouseMove((point) => {
    if (!drawing || draftPoints.length === 0) {
      return;
    }
    updateDraftVisuals(point);
  });

  unsubPolygonClick = mapContext.registerPolygonClick(LAYER_ID, onPolygonClicked);
}

export function onZonesButtonClick(mapContext?: MapContext): void {
  if (mapContext) {
    mapContextRef = mapContext;
  }
  if (!mapContextRef) {
    return;
  }
  mapContextRef.showDialog(DIALOG_ID);
  updateDialog();
}
