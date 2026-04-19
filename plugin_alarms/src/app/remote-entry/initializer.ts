import { ApplicationRef, createComponent, EnvironmentInjector, NgZone } from '@angular/core';
import { RemoteEntry } from './entry';

/**
 * Inicializador del plugin de alarmas.
 * Se puede llamar desde el shell para montar el componente de alarmas sin acoplarlo al árbol de detección.
 */
export async function initializeAlarmsPlugin(appRef: ApplicationRef, injector: EnvironmentInjector, ngZone: NgZone): Promise<void> {
  console.log('[AlarmsInitializer] Initializing alarms plugin...');
  
  // Run outside Angular zone to avoid change detection loops
  ngZone.runOutsideAngular(() => {
    // Create component in a separate zone
    const componentRef = createComponent(RemoteEntry, {
      environmentInjector: injector,
      hostElement: document.createElement('div'),
    });

    // Attach to the app but don't use the regular zone
    appRef.attachView(componentRef.hostView);
    
    const container = document.getElementById('alarms-plugin-container');
    if (container) {
      container.appendChild(componentRef.location.nativeElement);
      console.log('[AlarmsInitializer] Alarms plugin mounted successfully');
    } else {
      console.warn('[AlarmsInitializer] No container found for alarms plugin');
    }
  });
}

export { RemoteEntry };

// Default export for easier module federation loading
export default { initializeAlarmsPlugin };
