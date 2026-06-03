import { TestBed } from '@angular/core/testing';
import { DashboardAdminSectionComponent } from './dashboard-admin-section.component';

function createComponent() {
  TestBed.configureTestingModule({ imports: [DashboardAdminSectionComponent] })
    .overrideTemplate(DashboardAdminSectionComponent, '');
  const fixture = TestBed.createComponent(DashboardAdminSectionComponent);
  fixture.detectChanges();
  return fixture.componentInstance;
}

describe('DashboardAdminSectionComponent.badge()', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('ações de deleção/bloqueio → vermelho', () => {
    const c = createComponent();
    expect(c.badge('USER_DELETED')).toContain('text-red-300');
    expect(c.badge('ROLE_REMOVED')).toContain('text-red-300');
    expect(c.badge('ACCOUNT_LOCKED')).toContain('text-red-300');
    expect(c.badge('LOGIN_FAILED')).toContain('text-red-300');
    expect(c.badge('USER_DISABLED')).toContain('text-red-300');
  });

  it('ações de criação/ativação → verde', () => {
    const c = createComponent();
    expect(c.badge('USER_CREATED')).toContain('text-green-300');
    expect(c.badge('USER_ENABLED')).toContain('text-green-300');
    expect(c.badge('EMAIL_CHANGE_CONFIRMED')).toContain('text-green-300');
    expect(c.badge('ROLE_ASSIGNED')).toContain('text-green-300');
  });

  it('ações de sessão → azul', () => {
    const c = createComponent();
    expect(c.badge('USER_LOGGED_IN')).toContain('text-blue-300');
    expect(c.badge('USER_LOGGED_OUT')).toContain('text-blue-300');
    expect(c.badge('USER_SESSIONS_CLEARED')).toContain('text-blue-300');
  });

  it('ações de TOTP/backup → teal', () => {
    const c = createComponent();
    expect(c.badge('TOTP_ENABLED')).toContain('text-teal-300');
    expect(c.badge('TOTP_BACKUP_CODES_REGENERATED')).toContain('text-teal-300');
  });

  it('ações de senha/email → amarelo', () => {
    const c = createComponent();
    expect(c.badge('PASSWORD_RESET_REQUESTED')).toContain('text-yellow-300');
    expect(c.badge('USER_EMAIL_CHANGED')).toContain('text-yellow-300');
    expect(c.badge('USER_PASSWORD_CHANGED')).toContain('text-yellow-300');
  });

  it('ação desconhecida → cor padrão do tema', () => {
    const c = createComponent();
    const result = c.badge('UNKNOWN_ACTION');
    expect(result).toContain('text-[var(--text-primary)]');
  });
});
