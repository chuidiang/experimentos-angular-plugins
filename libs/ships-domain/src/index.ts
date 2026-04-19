import { shipRegistry } from './lib/registry';

// Auto-initialize registry on import
shipRegistry.initialize();

export * from './lib/interfaces';
export * from './lib/events';
export { shipRegistry } from './lib/registry';
