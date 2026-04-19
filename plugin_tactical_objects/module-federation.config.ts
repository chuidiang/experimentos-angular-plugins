import { ModuleFederationConfig } from '@nx/module-federation';

const config: ModuleFederationConfig = {
  name: 'plugin_tactical_objects',
  exposes: {
    './Routes': 'plugin_tactical_objects/src/app/remote-entry/entry.routes.ts',
    './MenuItems': 'plugin_tactical_objects/src/app/remote-entry/menu-items.ts',
    './LayerItems': 'plugin_tactical_objects/src/app/remote-entry/layer-items.ts',
  },
  shared: (libraryName, sharedConfig) => {
    if (
      libraryName === '@mi-sistema-plugins/ships-domain' ||
      libraryName === '@mi-sistema-plugins/tactical-zones-domain'
    ) {
      return {
        ...sharedConfig,
        singleton: true,
        strictVersion: false,
        requiredVersion: false,
      };
    }

    return sharedConfig;
  },
};

/**
 * Nx requires a default export of the config to allow correct resolution of the module federation graph.
 **/
export default config;
