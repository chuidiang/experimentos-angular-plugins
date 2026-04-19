import { LayerItem, MapContext } from '@mi-sistema-plugins/common-map';
import { initZonesLayer } from './zones-controller';

export const layerItems: LayerItem[] = [
  {
    id: 'tactical-zones',
    displayName: 'Tactical zones',
    init(mapContext: MapContext): void {
      initZonesLayer(mapContext);
    },
  },
];
