import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-pending-email-banner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div class="flex items-start gap-3 p-4 bg-blue-950/60 border border-blue-600/50 rounded-xl">
      <mat-icon class="text-blue-400 shrink-0 mt-0.5">mail</mat-icon>
      <div>
        <p class="text-blue-300 text-sm font-medium m-0">Confirmação de email pendente</p>
        <p class="text-blue-400/70 text-xs mt-1 m-0">
          Confirme a troca para
          <span class="font-medium text-blue-300">{{ pendingEmail() }}</span>.
          Verifique sua caixa de entrada.
        </p>
      </div>
    </div>
  `,
})
export class PendingEmailBannerComponent {
  readonly pendingEmail = input.required<string>();
}
