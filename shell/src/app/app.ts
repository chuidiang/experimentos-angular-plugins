import { AfterViewInit, Component, inject, signal, ApplicationRef, EnvironmentInjector, NgZone } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { loadRemote } from '@module-federation/enhanced/runtime';
import { MenuButton, MapContext, LayerItem, MapDialog } from '@mi-sistema-plugins/common-map';
import { shellMapContextFactory, shellMapEngineOptions } from './map-engine.config';
import { registeredPlugins } from './plugin-registry';

/** Estado interno de un diálogo flotante gestionado por el shell */
interface DialogEntry {
  id: string;
  title: string;
  visible: boolean;
  content: SafeHtml;
  x: number;
  y: number;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements AfterViewInit {
  private sanitizer = inject(DomSanitizer);
  private appRef = inject(ApplicationRef);
  private injector = inject(EnvironmentInjector);
  private ngZone = inject(NgZone);

  readonly menuButtons = signal<MenuButton[]>([]);
  readonly dialogs = signal<DialogEntry[]>([]);
  mapContext?: MapContext;

  // ── Drag logic ───────────────────────────────────────────────────────────
  private dragOffset = { x: 0, y: 0 };

  onDragStart(e: MouseEvent, dialogId: string): void {
    const panel = (e.currentTarget as HTMLElement).closest('.float-dialog') as HTMLElement;
    this.dragOffset = { x: e.clientX - panel.offsetLeft, y: e.clientY - panel.offsetTop };
    const onMove = (ev: MouseEvent) => {
      this.dialogs.update((list) =>
        list.map((d) =>
          d.id === dialogId
            ? { ...d, x: ev.clientX - this.dragOffset.x, y: ev.clientY - this.dragOffset.y }
            : d,
        ),
      );
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  closeDialog(id: string): void {
    this.dialogs.update((list) => list.map((d) => (d.id === id ? { ...d, visible: false } : d)));
  }

  ngAfterViewInit(): void {
    this.mapContext = shellMapContextFactory('world-map', {
      ...shellMapEngineOptions,
      dialogs: {
        registerDialog: (id, title): MapDialog => {
          this.dialogs.update((list) => {
            if (list.find((d) => d.id === id)) return list;
            return [
              ...list,
              {
                id,
                title,
                visible: false,
                content: this.sanitizer.bypassSecurityTrustHtml(''),
                x: 80,
                y: 80,
              },
            ];
          });
          return {
            setContent: (html: string) => {
              const safe = this.sanitizer.bypassSecurityTrustHtml(html);
              this.dialogs.update((list) =>
                list.map((d) => (d.id === id ? { ...d, content: safe } : d)),
              );
            },
          };
        },
        toggleDialog: (id) => {
          this.dialogs.update((list) =>
            list.map((d) => (d.id === id ? { ...d, visible: !d.visible } : d)),
          );
        },
        showDialog: (id) => {
          this.dialogs.update((list) =>
            list.map((d) => (d.id === id ? { ...d, visible: true } : d)),
          );
        },
      },
    });

    for (const plugin of registeredPlugins) {
      loadRemote<{ menuItems: MenuButton[] }>(`${plugin}/MenuItems`)
        .then((mod) => {
          if (mod?.menuItems) {
            this.menuButtons.update((list) => [...list, ...mod.menuItems]);
          }
        })
        .catch(() => {/* plugin no expone MenuItems */});

      loadRemote<{ layerItems: LayerItem[] }>(`${plugin}/LayerItems`)
        .then((mod) => {
          mod?.layerItems?.forEach((item) => item.init(this.mapContext!));
        })
        .catch(() => {/* plugin no expone LayerItems */});

      loadRemote<any>(`${plugin}/Routes`)
        .then((mod) => {
          if (typeof mod?.initializeAlarmsPlugin === 'function') {
            mod.initializeAlarmsPlugin(this.appRef, this.injector, this.ngZone);
          }
        })
        .catch(() => {/* plugin no expone Routes o no está disponible */});
    }
  }
}

