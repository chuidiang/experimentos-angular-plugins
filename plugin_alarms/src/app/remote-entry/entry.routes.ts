import { Route } from '@angular/router';
import { ApplicationRef, createComponent, EnvironmentInjector, NgZone } from '@angular/core';
import { RemoteEntry } from './entry';

export const remoteRoutes: Route[] = [{ path: '', component: RemoteEntry }];

/**
 * Inicializador del plugin de alarmas.
 */
export function initializeAlarmsPlugin(appRef: ApplicationRef, injector: EnvironmentInjector, ngZone: NgZone): void {
  console.log('[initializeAlarmsPlugin] Initializing alarms plugin...');
  
  // Run outside Angular zone to avoid change detection loops
  ngZone.runOutsideAngular(() => {
    // Create component in a separate zone
    const componentRef = createComponent(RemoteEntry, {
      environmentInjector: injector,
      hostElement: document.createElement('div'),
    });

    // Attach to the app
    appRef.attachView(componentRef.hostView);
    
    const container = document.getElementById('alarms-plugin-container');
    if (container) {
      container.appendChild(componentRef.location.nativeElement);
      console.log('[initializeAlarmsPlugin] Alarms plugin mounted successfully');
    } else {
      console.warn('[initializeAlarmsPlugin] No container found for alarms plugin');
    }
  });
}
