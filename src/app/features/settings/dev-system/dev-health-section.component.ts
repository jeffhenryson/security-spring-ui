import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { HealthStatus } from '../../../core/dev/dev.service';

@Component({
  selector: 'app-dev-health-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <section>
      <h4 class="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-widest mb-3">
        Health Check
      </h4>
      @if (loading()) {
        <div class="skeleton h-16 rounded-xl"></div>
      } @else if (health()) {
        <div class="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl p-4 flex flex-col gap-3">
          <div class="flex items-center gap-3">
            <div
              class="w-2.5 h-2.5 rounded-full"
              [class]="health()!.status === 'UP' ? 'bg-green-400' : 'bg-red-400'"
            ></div>
            <span class="font-semibold text-sm text-[var(--text-primary)]">
              {{ health()!.status }}
            </span>
            <span class="text-xs text-[var(--text-muted)] ml-auto">
              {{ updatedAt() }}
            </span>
          </div>

          @if (health()!.components) {
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
              @for (entry of healthComponents(); track entry.name) {
                <div
                  class="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs"
                  [class]="entry.status === 'UP'
                    ? 'border-green-500/20 bg-green-500/5 text-green-400'
                    : 'border-red-500/20 bg-red-500/5 text-red-400'"
                >
                  <div
                    class="w-1.5 h-1.5 rounded-full shrink-0"
                    [class]="entry.status === 'UP' ? 'bg-green-400' : 'bg-red-400'"
                  ></div>
                  <span class="font-medium">{{ entry.name }}</span>
                  <span class="ml-auto opacity-70">{{ entry.status }}</span>
                </div>
              }
            </div>
          }
        </div>
      } @else {
        <div class="bg-[var(--surface-color)] border border-red-500/30 rounded-xl p-4 text-sm text-red-400 flex items-center gap-2">
          <mat-icon class="!text-[18px] shrink-0">{{ error() === 'forbidden' ? 'lock' : 'cloud_off' }}</mat-icon>
          <span>{{ error() === 'forbidden'
            ? 'Sem permissão para acessar o actuator. Verifique a configuração DEV_ELEVATED no backend.'
            : 'Erro ao carregar health check. Verifique se o backend está ativo.' }}</span>
        </div>
      }
    </section>
  `,
})
export class DevHealthSectionComponent {
  readonly health = input<HealthStatus | null>(null);
  readonly loading = input(false);
  readonly error = input<'forbidden' | 'error' | null>(null);
  readonly updatedAt = input('');

  readonly healthComponents = computed(() => {
    const components = this.health()?.components ?? {};
    return Object.entries(components).map(([name, val]) => ({ name, status: val.status }));
  });
}
