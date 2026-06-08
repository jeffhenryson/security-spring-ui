import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpErrorResponse } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiConfiguration } from '../../../api/api-configuration';
import { StatsService } from '../../../core/admin/stats.service';
import { DevService, HealthStatus } from '../../../core/dev/dev.service';
import { environment } from '../../../../environments/environment';
import { DevHealthSectionComponent } from './dev-health-section.component';
import { DevStatsSectionComponent, DevStats } from './dev-stats-section.component';

@Component({
  selector: 'app-dev-system',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    DevHealthSectionComponent,
    DevStatsSectionComponent,
  ],
  template: `
    <div class="p-6 max-w-3xl mx-auto flex flex-col gap-6">
      <div class="flex items-center gap-2">
        <h3 class="text-base font-semibold text-[var(--text-primary)] m-0">Sistema</h3>
        <span
          class="px-2 py-0.5 rounded text-[10px] font-bold border"
          [class]="profileBadgeClass()"
        >
          {{ profileBadgeLabel() }}
        </span>
        <button
          mat-icon-button
          class="!ml-auto"
          (click)="refresh()"
          [disabled]="loading()"
          matTooltip="Recarregar"
        >
          @if (loading()) {
            <mat-icon class="cs-spinner cs-spinner--sm">autorenew</mat-icon>
          } @else {
            <mat-icon>refresh</mat-icon>
          }
        </button>
      </div>

      <app-dev-health-section
        [health]="health()"
        [loading]="healthLoading()"
        [error]="healthError()"
        [updatedAt]="healthUpdatedAt()"
      />

      <app-dev-stats-section [stats]="stats()" [loading]="statsLoading()" />

      <!-- Configuração do servidor -->
      <section>
        <h4 class="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-widest mb-3">
          Configuração
        </h4>
        <div class="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl divide-y divide-[var(--border-color)]">
          <div class="config-row">
            <span class="config-key">API URL</span>
            <code class="config-val">{{ apiUrl }}</code>
          </div>
          <div class="config-row">
            <span class="config-key">Ambiente</span>
            <code class="config-val">{{ activeProfile() }}</code>
          </div>
        </div>
      </section>

      <!-- Grafana panels -->
      @if (grafanaUrl()) {
        <section class="flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-semibold text-[var(--text-primary)] m-0">Métricas ao vivo</h4>
            <a [href]="grafanaDashboardUrl()" target="_blank" rel="noopener"
               class="text-xs text-[var(--active-color)] hover:underline flex items-center gap-1">
              <mat-icon class="!text-[14px] !w-[14px] !h-[14px]">open_in_new</mat-icon>
              Abrir Grafana
            </a>
          </div>
          <p class="text-xs text-[var(--text-secondary)] -mt-2">
            Via Prometheus · atualização a cada 30s
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            @for (panel of grafanaPanels(); track panel.id) {
              <div class="border border-[var(--border-color)] rounded-xl overflow-hidden bg-[var(--surface-color)]">
                <p class="text-xs text-[var(--text-secondary)] px-3 pt-2 pb-1 m-0">{{ panel.title }}</p>
                <!-- bypassSecurityTrustResourceUrl: URL controlada pelo environment (grafanaUrl),
                     nunca por entrada do usuário. Rota protegida por devElevationGuard. -->
                <iframe
                  [src]="panel.safeUrl"
                  width="100%"
                  height="180"
                  frameborder="0"
                  [title]="panel.title"
                ></iframe>
              </div>
            }
          </div>
        </section>
      } @else {
        <div class="flex items-center gap-2 p-3 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] text-sm">
          <mat-icon class="!text-[18px]">bar_chart</mat-icon>
          <span>Grafana não configurado. Defina <code>grafanaUrl</code> no environment.</span>
        </div>
      }

      <!-- Swagger UI -->
      <section>
        <h4 class="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-widest mb-3">
          API Docs
        </h4>
        <a [href]="swaggerUrl()" target="_blank" rel="noopener"
           class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-color)] text-sm text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors no-underline">
          <mat-icon class="!text-[18px] !text-green-400">api</mat-icon>
          Abrir Swagger UI
          <mat-icon class="!text-[14px] !w-[14px] !h-[14px] ml-auto text-[var(--text-muted)]">open_in_new</mat-icon>
        </a>
      </section>
    </div>
  `,
  styles: [`
    .config-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      gap: 8px;
    }
    .config-key { font-size: 0.75rem; color: var(--text-secondary); }
    .config-val { font-size: 0.75rem; color: var(--text-primary); font-family: monospace; }
  `],
})
export class DevSystemComponent implements OnInit {
  private readonly devService = inject(DevService);
  private readonly config = inject(ApiConfiguration);
  private readonly statsService = inject(StatsService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly loading = signal(false);
  readonly healthLoading = signal(false);
  readonly statsLoading = signal(false);
  readonly health = signal<HealthStatus | null>(null);
  readonly healthError = signal<'forbidden' | 'error' | null>(null);
  readonly stats = signal<DevStats | null>(null);
  readonly healthUpdatedAt = signal('');
  readonly activeProfile = signal('carregando...');

  readonly apiUrl = this.config.rootUrl;

  readonly profileBadgeLabel = computed(() => {
    const p = this.activeProfile();
    if (p === 'carregando...') return 'DEV';
    return p.toUpperCase();
  });

  readonly profileBadgeClass = computed(() => {
    const p = this.activeProfile().toLowerCase();
    if (p === 'prod' || p === 'production') return 'bg-red-500/15 text-red-400 border-red-500/30';
    if (p === 'hml' || p === 'homologacao' || p === 'staging') return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  });

  readonly swaggerUrl = computed(() => `${this.config.rootUrl}/swagger-ui/index.html`);
  readonly grafanaUrl = signal(environment.grafanaUrl ?? '');

  readonly grafanaDashboardUrl = computed(() => {
    const base = this.grafanaUrl();
    return base ? `${base}/d/security-spring/security-spring` : '';
  });

  readonly grafanaPanels = computed<Array<{ id: number; title: string; safeUrl: SafeResourceUrl }>>(() => {
    const base = this.grafanaUrl();
    if (!base) return [];
    const dash = 'security-spring/security-spring';
    const common = `orgId=1&refresh=30s&theme=dark`;
    return [
      { id: 1,  title: 'Logins',       url: `${base}/d-solo/${dash}?${common}&panelId=1` },
      { id: 35, title: 'Latência HTTP', url: `${base}/d-solo/${dash}?${common}&panelId=35` },
      { id: 3,  title: 'Heap JVM',     url: `${base}/d-solo/${dash}?${common}&panelId=3` },
    ].map((p) => ({
      id: p.id,
      title: p.title,
      safeUrl: this.sanitizer.bypassSecurityTrustResourceUrl(p.url),
    }));
  });

  ngOnInit(): void {
    this.loadAll();
  }

  refresh(): void {
    this.loadAll();
  }

  private async loadAll(): Promise<void> {
    this.loading.set(true);
    await Promise.allSettled([this.loadHealth(), this.loadStats(), this.loadSystemInfo()]);
    this.loading.set(false);
  }

  private async loadSystemInfo(): Promise<void> {
    try {
      const info = await this.devService.systemInfo();
      this.activeProfile.set(info.profile || 'unknown');
      if (info.status === 'UP') {
        this.health.update((h) => h ?? { status: 'UP' });
      }
    } catch {
      // keep 'carregando...' if it fails
    }
  }

  private async loadHealth(): Promise<void> {
    this.healthLoading.set(true);
    try {
      const data = await this.devService.health();
      this.health.set(data);
      this.healthError.set(null);
      this.healthUpdatedAt.set(
        new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      );
    } catch (err) {
      this.health.set(null);
      this.healthError.set(
        err instanceof HttpErrorResponse && err.status === 403 ? 'forbidden' : 'error',
      );
    } finally {
      this.healthLoading.set(false);
    }
  }

  private async loadStats(): Promise<void> {
    this.statsLoading.set(true);
    try {
      const data = await this.statsService.get();
      this.stats.set(data as DevStats);
    } catch {
      this.stats.set(null);
    } finally {
      this.statsLoading.set(false);
    }
  }
}
