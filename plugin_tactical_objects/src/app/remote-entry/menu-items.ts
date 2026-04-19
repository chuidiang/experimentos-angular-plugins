import { MenuButton, MapContext } from '@mi-sistema-plugins/common-map';
import { onZonesButtonClick } from './zones-controller';

export const menuItems: MenuButton[] = [
  {
    label: 'zones',
    action: (mapContext?: MapContext) => {
      onZonesButtonClick(mapContext);
    },
  },
];
