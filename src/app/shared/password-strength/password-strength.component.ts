import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface StrengthRule {
  label: string;
  test: (pw: string) => boolean;
}

const RULES: StrengthRule[] = [
  { label: 'Mínimo 8 caracteres', test: pw => pw.length >= 8 },
  { label: '1 letra maiúscula', test: pw => /[A-Z]/.test(pw) },
  { label: '1 letra minúscula', test: pw => /[a-z]/.test(pw) },
  { label: '1 número', test: pw => /\d/.test(pw) },
  { label: '1 caractere especial', test: pw => /[^A-Za-z\d]/.test(pw) },
];

@Component({
  selector: 'app-password-strength',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (pw()) {
      <div class="mt-2 flex flex-col gap-1.5">
        <!-- Barra de força -->
        <div class="flex gap-1 h-1">
          @for (i of segments; track i) {
            <div
              class="flex-1 rounded-full transition-colors duration-300"
              [class]="barColor(i)"
            ></div>
          }
        </div>
        <!-- Label de força -->
        <p class="text-xs font-medium" [class]="labelColor()">{{ strengthLabel() }}</p>
        <!-- Regras individuais -->
        <ul class="flex flex-col gap-0.5 mt-0.5">
          @for (rule of rules; track rule.label) {
            <li class="flex items-center gap-1.5 text-xs"
                [class.text-[var(--text-muted)]]="!rule.test(pw())"
                [class.text-green-400]="rule.test(pw())">
              <span class="text-[10px] leading-none">{{ rule.test(pw()) ? '✓' : '○' }}</span>
              {{ rule.label }}
            </li>
          }
        </ul>
      </div>
    }
  `,
})
export class PasswordStrengthComponent {
  readonly rules = RULES;
  readonly segments = [0, 1, 2, 3, 4];

  readonly password = input<string | null>(null);
  readonly pw = computed(() => this.password() ?? '');

  private readonly score = computed(() => RULES.filter(r => r.test(this.pw())).length);

  strengthLabel(): string {
    const s = this.score();
    if (s <= 1) return 'Muito fraca';
    if (s === 2) return 'Fraca';
    if (s === 3) return 'Média';
    if (s === 4) return 'Forte';
    return 'Muito forte';
  }

  labelColor(): string {
    const s = this.score();
    if (s <= 1) return 'text-red-400';
    if (s === 2) return 'text-orange-400';
    if (s === 3) return 'text-yellow-400';
    if (s === 4) return 'text-green-400';
    return 'text-emerald-400';
  }

  barColor(index: number): string {
    const s = this.score();
    if (index >= s) return 'bg-[var(--border-color)]';
    if (s <= 1) return 'bg-red-500';
    if (s === 2) return 'bg-orange-500';
    if (s === 3) return 'bg-yellow-500';
    if (s === 4) return 'bg-green-500';
    return 'bg-emerald-500';
  }
}
