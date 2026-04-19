import { Route } from '@angular/router';
import { loadRemote } from '@module-federation/enhanced/runtime';
import { RemoteRoutes } from '@mi-sistema-plugins/common-plugin';

export const appRoutes: Route[] = [
  {
    path: 'plugin_tracks',
    loadChildren: () =>
      loadRemote<RemoteRoutes>('plugin_tracks/Routes').then(
        (m) => m!.remoteRoutes,
      ),
  },
  { path: '**', redirectTo: '' },
];

