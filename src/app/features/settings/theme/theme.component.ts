import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { ThemeService, Theme } from '../../../core/theme/theme.service';

interface ThemeOption {
  value: Theme;
  label: string;
  icon: string;
  description: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    value: 'dark',
    label: 'Escuro',
    icon: 'dark_mode',
    description: 'Interface escura para ambientes com pouca luz',
  },
  {
    value: 'light',
    label: 'Claro',
    icon: 'light_mode',
    description: 'Interface clara para ambientes bem iluminados',
  },
  {
    value: 'system',
    label: 'Sistema',
    icon: 'settings_brightness',
    description: 'Segue a preferência do sistema operacional',
  },
];

@Component({
  selector: 'app-theme-settings',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, MatCardModule],
  template: `
    <div class="p-6 max-w-2xl">
      <h2 class="text-lg font-semibold text-primary mb-1">Tema</h2>
      <p class="text-sm text-secondary mb-6">Escolha como a interface será exibida.</p>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        @for (option of options; track option.value) {
          <button
            type="button"
            (click)="select(option.value)"
            class="theme-card flex flex-col items-start gap-3 p-4 rounded-xl border-2 text-left
                   transition-all duration-150 cursor-pointer"
            [class.selected]="isSelected(option.value)"
          >
            <div class="flex items-center gap-2 w-full">
              <mat-icon class="!text-[22px] !w-[22px] !h-[22px]">{{ option.icon }}</mat-icon>
              <span class="text-sm font-medium flex-1">{{ option.label }}</span>
              @if (isSelected(option.value)) {
                <mat-icon class="!text-[18px] !w-[18px] !h-[18px] text-cyan-400"
                  >check_circle</mat-icon
                >
              }
            </div>
            <span class="text-xs text-secondary">{{ option.description }}</span>
          </button>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .theme-card {
        background: var(--surface-color);
        border-color: var(--border-color);
        color: var(--text-primary);
      }
      .theme-card:hover {
        border-color: rgb(34 211 238 / 0.5);
        background: var(--surface-hover);
      }
      .theme-card.selected {
        border-color: rgb(34 211 238);
        background: rgb(34 211 238 / 0.08);
      }
      .text-secondary {
        color: var(--text-secondary);
      }
      .text-primary {
        color: var(--text-primary);
      }
    `,
  ],
})
export class ThemeSettingsComponent {
  private readonly themeService = inject(ThemeService);

  readonly options = THEME_OPTIONS;
  readonly currentTheme = this.themeService.theme;

  isSelected(value: Theme): boolean {
    return this.currentTheme() === value;
  }

  select(value: Theme): void {
    this.themeService.setTheme(value);
  }
}
