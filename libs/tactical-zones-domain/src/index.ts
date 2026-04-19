import { tacticalZoneRegistry } from './lib/registry';

// Auto-initialize registry on import
tacticalZoneRegistry.initialize();

export * from './lib/interfaces';
export * from './lib/events';
export { tacticalZoneRegistry } from './lib/registry';
