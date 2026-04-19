import { Route } from '@angular/router';
import { loadRemote } from '@module-federation/enhanced/runtime';
import { RemoteRoutes } from '@mi-sistema-plugins/common-plugin';
import { registeredPlugins } from './plugin-registry';

export const appRoutes: Route[] = [
  ...registeredPlugins.map((plugin) => ({
    path: plugin,
    loadChildren: () =>
      loadRemote<RemoteRoutes>(`${plugin}/Routes`).then((m) => m!.remoteRoutes),
  })),
  { path: '**', redirectTo: '' },
];

