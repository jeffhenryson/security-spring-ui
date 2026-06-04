import { badgeFor } from './dashboard-admin-section.component';

describe('DashboardAdminSectionComponent — badgeFor()', () => {
  it('ações de deleção/bloqueio → vermelho', () => {
    expect(badgeFor('USER_DELETED')).toContain('text-red-300');
    expect(badgeFor('ROLE_REMOVED')).toContain('text-red-300');
    expect(badgeFor('ACCOUNT_LOCKED')).toContain('text-red-300');
    expect(badgeFor('LOGIN_FAILED')).toContain('text-red-300');
    expect(badgeFor('USER_DISABLED')).toContain('text-red-300');
  });

  it('ações de criação/ativação → verde', () => {
    expect(badgeFor('USER_CREATED')).toContain('text-green-300');
    expect(badgeFor('USER_ENABLED')).toContain('text-green-300');
    expect(badgeFor('EMAIL_CHANGE_CONFIRMED')).toContain('text-green-300');
    expect(badgeFor('ROLE_ASSIGNED')).toContain('text-green-300');
  });

  it('ações de sessão → azul', () => {
    expect(badgeFor('USER_LOGGED_IN')).toContain('text-blue-300');
    expect(badgeFor('USER_LOGGED_OUT')).toContain('text-blue-300');
    expect(badgeFor('USER_SESSIONS_CLEARED')).toContain('text-blue-300');
  });

  it('ações de TOTP/backup → teal', () => {
    expect(badgeFor('TOTP_ENABLED')).toContain('text-teal-300');
    expect(badgeFor('TOTP_BACKUP_CODES_REGENERATED')).toContain('text-teal-300');
  });

  it('ações de senha/email → amarelo', () => {
    expect(badgeFor('PASSWORD_RESET_REQUESTED')).toContain('text-yellow-300');
    expect(badgeFor('USER_EMAIL_CHANGED')).toContain('text-yellow-300');
    expect(badgeFor('USER_PASSWORD_CHANGED')).toContain('text-yellow-300');
  });

  it('ação desconhecida → cor padrão do tema', () => {
    expect(badgeFor('UNKNOWN_ACTION')).toContain('text-[var(--text-primary)]');
  });
});
