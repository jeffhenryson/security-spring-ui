import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-oauth2-callback',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatProgressSpinnerModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
      @if (error()) {
        <div class="text-center">
          <p class="text-red-400 text-sm mb-4">{{ error() }}</p>
          <a href="/auth/login" class="text-[var(--active-color)] text-sm hover:underline">
            Voltar para o login
          </a>
        </div>
      } @else {
        <div class="flex flex-col items-center gap-4">
          <mat-spinner diameter="40" />
          <p class="text-[var(--text-secondary)] text-sm">Finalizando autenticação...</p>
        </div>
      }
    </div>
  `,
})
export class OAuth2CallbackComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  readonly error = signal('');

  async ngOnInit(): Promise<void> {
    const token = this.route.snapshot.queryParamMap.get('token');
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

    if (!token) {
      this.error.set('Token de autenticação ausente. Tente fazer login novamente.');
      return;
    }

    try {
      await this.authService.handleTokenPair({
        accessToken: token,
        tokenType: 'Bearer',
        expiresIn: 900,
      });
      const dest =
        returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//')
          ? returnUrl
          : '/app/dashboard';
      this.router.navigateByUrl(dest);
    } catch {
      this.error.set('Falha ao autenticar com Google. Tente novamente.');
    }
  }
}
