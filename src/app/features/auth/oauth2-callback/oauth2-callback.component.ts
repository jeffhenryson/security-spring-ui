import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// Esta rota existia para o fluxo de redirect OAuth2 (legado).
// Com a migração para Google Identity Services (GIS + popup), a URL /auth/oauth2/callback
// nunca é chamada. O componente redireciona para o login como fallback seguro.
@Component({
  selector: 'app-oauth2-callback',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatProgressSpinnerModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
      <mat-spinner diameter="40" />
    </div>
  `,
})
export class OAuth2CallbackComponent implements OnInit {
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.router.navigate(['/auth/login']);
  }
}
