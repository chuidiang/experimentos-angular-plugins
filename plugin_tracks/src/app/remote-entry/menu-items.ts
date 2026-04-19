import { MenuButton, MapContext } from '@mi-sistema-plugins/common-map';

const DIALOG_ID = 'ships-panel';

export const menuItems: MenuButton[] = [
  {
    label: 'Tracks',
    action: (mapContext?: MapContext) => {
      mapContext?.toggleDialog(DIALOG_ID);
    },
  },
];
