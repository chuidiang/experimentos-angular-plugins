/**
 * Names of all plugins registered at runtime from module-federation.manifest.json.
 * Populated in main.ts before Angular bootstrap — do NOT mutate after that point.
 */
export let registeredPlugins: readonly string[] = [];

/** Called once by main.ts immediately after reading the manifest. */
export function setRegisteredPlugins(names: string[]): void {
  registeredPlugins = names;
}
