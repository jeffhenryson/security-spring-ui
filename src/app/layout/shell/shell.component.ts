import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { trigger, transition, style, animate, query } from '@angular/animations';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent],
  animations: [
    trigger('routeAnimations', [
      transition('* <=> *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(6px)' }),
          animate('180ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
        ], { optional: true }),
      ]),
    ]),
  ],
  template: `
    <div class="flex h-screen overflow-hidden">
      <app-sidebar />
      <div class="flex flex-col flex-1 min-w-0">
        <app-topbar />
        <main class="flex-1 overflow-y-auto flex flex-col" [@routeAnimations]="getAnimation(outlet)">
          <router-outlet #outlet="outlet" />
        </main>
      </div>
    </div>
  `,
})
export class ShellComponent {
  getAnimation(outlet: RouterOutlet): string {
    return outlet?.activatedRouteData?.['title'] ?? '';
  }
}
