import { LayerItem, MapContext } from '@mi-sistema-plugins/common-map';
import { Ship, ShipEvents } from '@mi-sistema-plugins/ships-domain';

const LAYER_ID = 'ships';
const DIALOG_ID = 'ships-panel';

const SHIP_STYLE = { radius: 8, color: '#003399', fillColor: '#3399ff', fillOpacity: 0.85 };

const ships: Ship[] = [
  { id: 'ship-1', name: 'Atlantico I', lat: 25.0, lng: -40.0, speedKnots: 10 },
  { id: 'ship-2', name: 'Atlantico II', lat: 28.0, lng: -38.0, speedKnots: 15 },
  { id: 'ship-3', name: 'Caribe Star', lat: 22.0, lng: -42.0, speedKnots: 8 },
  { id: 'ship-4', name: 'Ocean Runner', lat: 26.5, lng: -35.0, speedKnots: 20 },
];

/** Δlng en grados por tick de 3s a la velocidad dada hacia el oeste */
function deltaLng(lat: number, speedKnots: number): number {
  const distanceNm = speedKnots * (3 / 3600);
  return -(distanceNm / (60 * Math.cos((lat * Math.PI) / 180)));
}

function renderTable(data: Ship[]): string {
  const rows = data
    .map(
      (s) =>
        `<tr>
          <td>${s.name}</td>
          <td>${s.lat.toFixed(3)}</td>
          <td>${s.lng.toFixed(3)}</td>
          <td>${s.speedKnots}</td>
        </tr>`,
    )
    .join('');
  return `
    <style>
      .ships-tbl { width:100%; border-collapse:collapse; font-size:13px; }
      .ships-tbl th, .ships-tbl td { padding:4px 8px; text-align:left; border-bottom:1px solid #e0e0e0; }
      .ships-tbl th { background:#f4f4f4; font-weight:600; }
      .ships-tbl tr:hover td { background:#f0f7ff; }
    </style>
    <table class="ships-tbl">
      <thead><tr><th>Nombre</th><th>Lat</th><th>Lng</th><th>Velocidad (kn)</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

export const layerItems: LayerItem[] = [
  {
    id: LAYER_ID,
    displayName: 'Barcos',
    init(mapContext: MapContext): void {
      mapContext.registerLayer(LAYER_ID, 'Barcos');
      const dialog = mapContext.registerDialog(DIALOG_ID, 'Barcos');

      ships.forEach((ship) => {
        mapContext.setCircleMarker(LAYER_ID, ship.id, ship.lat, ship.lng, SHIP_STYLE);
        ShipEvents.emitCreated(ship);
      });
      dialog.setContent(renderTable(ships));

      setInterval(() => {
        ships.forEach((ship) => {
          ship.lng += deltaLng(ship.lat, ship.speedKnots);
          ShipEvents.emitUpdated(ship);

          // Simulate delete/create lifecycle when crossing the map bounds.
          if (ship.lng < -180) {
            ShipEvents.emitDeleted(ship);
            ship.lng = 180;
            ShipEvents.emitCreated(ship);
          }

          mapContext.setCircleMarker(LAYER_ID, ship.id, ship.lat, ship.lng, SHIP_STYLE);
        });
        dialog.setContent(renderTable(ships));
      }, 3000);
    },
  },
];
