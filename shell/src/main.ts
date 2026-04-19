import { registerRemotes } from '@module-federation/enhanced/runtime';
import { setRegisteredPlugins } from './app/plugin-registry';

fetch('/module-federation.manifest.json')
  .then((res) => res.json())
  .then((remotes: Record<string, string>) => {
    setRegisteredPlugins(Object.keys(remotes));
    return Object.entries(remotes).map(([name, entry]) => ({ name, entry }));
  })
  .then((remotes) => registerRemotes(remotes))
  .then(() => import('./bootstrap').catch((err) => console.error(err)));
