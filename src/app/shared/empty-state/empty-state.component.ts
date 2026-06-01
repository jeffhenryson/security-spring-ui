import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div class="flex flex-col items-center gap-3 py-12 text-[var(--text-muted)]">
      <mat-icon class="!text-5xl !w-12 !h-12 opacity-25">{{ icon() }}</mat-icon>
      <p class="text-sm m-0">{{ message() }}</p>
    </div>
  `,
})
export class EmptyStateComponent {
  readonly message = input.required<string>();
  readonly icon = input<string>('inbox');
}
