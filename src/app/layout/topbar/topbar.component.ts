import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, NavigationEnd, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDivider } from '@angular/material/divider';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { AuthStore } from '../../core/auth/auth.store';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [RouterLink, MatIconModule, MatButtonModule, MatMenuModule, MatDivider],
  template: `
    <header class="flex items-center h-14 px-6 topbar-bg border-b topbar-border shrink-0">

      <h1 class="flex-1 text-base font-semibold topbar-title m-0">{{ pageTitle() }}</h1>

      <!-- Settings icon button -->
      <a [routerLink]="['/app/settings']"
         mat-icon-button
         matTooltip="Configurações"
         class="topbar-icon-btn mr-1">
        <mat-icon>settings</mat-icon>
      </a>

      <!-- User avatar menu -->
      <button [matMenuTriggerFor]="userMenu"
              class="w-9 h-9 rounded-full bg-cyan-700 text-xs font-bold text-white
                     cursor-pointer border-0 hover:bg-cyan-600 transition-colors
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">
        {{ userInitials() }}
      </button>

      <mat-menu #userMenu="matMenu" xPosition="before">
        <div class="px-4 py-2" style="border-bottom: 1px solid var(--border-color)">
          <p class="text-sm font-medium topbar-menu-name m-0">{{ username() }}</p>
          <p class="text-xs topbar-menu-email m-0">{{ userEmail() }}</p>
        </div>
        <a mat-menu-item [routerLink]="['/app/settings/profile']">
          <mat-icon>person</mat-icon>
          <span>Perfil</span>
        </a>
        <a mat-menu-item [routerLink]="['/app/settings/security']">
          <mat-icon>security</mat-icon>
          <span>Segurança</span>
        </a>
        <a mat-menu-item [routerLink]="['/app/settings/theme']">
          <mat-icon>palette</mat-icon>
          <span>Tema</span>
        </a>
        <mat-divider />
        <button mat-menu-item (click)="logout()" [disabled]="loggingOut()">
          <mat-icon>{{ loggingOut() ? 'hourglass_empty' : 'logout' }}</mat-icon>
          <span>{{ loggingOut() ? 'Saindo...' : 'Sair' }}</span>
        </button>
      </mat-menu>

    </header>
  `,
  styles: [`
    header {
      background: var(--bg-primary);
      border-color: var(--border-color);
    }
    .topbar-title { color: var(--text-primary); }
    .topbar-menu-name { color: var(--text-primary); }
    .topbar-menu-email { color: var(--text-secondary); }
    .topbar-icon-btn {
      color: var(--text-muted);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: none;
      background: transparent;
      cursor: pointer;
      transition: color 150ms, background 150ms;
    }
    .topbar-icon-btn:hover {
      color: var(--text-primary);
      background: var(--surface-hover);
    }
  `]
})
export class TopbarComponent {
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly store = inject(AuthStore);
  private readonly authService = inject(AuthService);

  readonly pageTitle = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      startWith(null),
      map(() => {
        let route = this.activatedRoute;
        while (route.firstChild) route = route.firstChild;
        return (route.snapshot.data['title'] as string | undefined) ?? 'SecuritySpring';
      })
    ),
    { initialValue: '' }
  );

  readonly username = computed(() => this.store.currentUser()?.username ?? '');
  readonly userEmail = computed(() => this.store.currentUser()?.email ?? '');
  readonly userInitials = computed(() =>
    (this.store.currentUser()?.username ?? '').slice(0, 2).toUpperCase()
  );

  readonly loggingOut = signal(false);

  async logout(): Promise<void> {
    if (this.loggingOut()) return;
    this.loggingOut.set(true);
    try {
      await this.authService.logout();
    } finally {
      this.loggingOut.set(false);
    }
  }
}
