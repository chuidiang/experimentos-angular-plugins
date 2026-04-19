import { ModuleFederationConfig } from '@nx/module-federation';

const config: ModuleFederationConfig = {
  name: 'shell',
  remotes: ['plugin_tracks', 'plugin_tactical_objects'],
  shared: (libraryName, sharedConfig) => {
    if (
      libraryName === '@mi-sistema-plugins/ships-domain' ||
      libraryName === '@mi-sistema-plugins/tactical-zones-domain'
    ) {
      return {
        ...sharedConfig,
        singleton: true,
        strictVersion: false,
        eager: true, // Make shell load these first
      };
    }

    return sharedConfig;
  },
};

/**
 * Nx requires a default export of the config to allow correct resolution of the module federation graph.
 **/
export default config;
