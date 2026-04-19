/**
 * Tipo de retorno que cualquier remote de Module Federation debe exportar
 * para ser cargado como rutas por el shell.
 */
export interface RemoteRoutes {
  remoteRoutes: import('@angular/router').Route[];
}

/** Interfaz de contrato base de un plugin. */
export interface PluginContract {
  name: string;
  version: string;
}

/** Evento genérico para comunicación entre shell y plugins. */
export interface PluginEvent<T = unknown> {
  type: string;
  payload?: T;
  timestamp: number;
}

/** Configuración que el shell puede pasar a los plugins al cargarlos. */
export interface PluginConfig {
  locale?: string;
  theme?: 'light' | 'dark';
  [key: string]: unknown;
}
