import { TestBed } from '@angular/core/testing';
import { AuditLogTableComponent } from './audit-log-table.component';
import { AuditLogResponse } from '../../core/admin/audit-logs.service';

const MOCK_ROW: AuditLogResponse = {
  id: 1,
  timestamp: '2026-01-01T10:00:00Z',
  action: 'USER_LOGGED_IN',
  who: 'admin',
  target: null,
  ipAddress: '127.0.0.1',
};

describe('AuditLogTableComponent', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({ imports: [AuditLogTableComponent] })
      .overrideTemplate(AuditLogTableComponent, ''),
  );

  function create(overrides: Partial<{ rows: AuditLogResponse[]; loading: boolean; total: number; showCriticalBadge: boolean }> = {}) {
    const fixture = TestBed.createComponent(AuditLogTableComponent);
    const c = fixture.componentInstance;
    fixture.componentRef.setInput('rows', overrides.rows ?? [MOCK_ROW]);
    fixture.componentRef.setInput('loading', overrides.loading ?? false);
    fixture.componentRef.setInput('total', overrides.total ?? 1);
    if (overrides.showCriticalBadge !== undefined) {
      fixture.componentRef.setInput('showCriticalBadge', overrides.showCriticalBadge);
    }
    fixture.detectChanges();
    return c;
  }

  it('cria o componente', () => {
    const c = create();
    expect(c).toBeTruthy();
  });

  describe('badgeClass()', () => {
    it('retorna classe para ação conhecida', () => {
      const c = create();
      expect(c.badgeClass('USER_LOGGED_IN')).toContain('blue');
      expect(c.badgeClass('USER_DELETED')).toContain('red');
      expect(c.badgeClass('TOTP_ENABLED')).toContain('teal');
    });

    it('retorna classe padrão para ação desconhecida', () => {
      const c = create();
      expect(c.badgeClass('ACAO_DESCONHECIDA')).toContain('surface-hover');
    });
  });

  describe('isCritical()', () => {
    it('retorna true para eventos críticos de segurança', () => {
      const c = create({ showCriticalBadge: true });
      expect(c.isCritical('TOKEN_THEFT_DETECTED')).toBe(true);
      expect(c.isCritical('ACCOUNT_LOCKED')).toBe(true);
      expect(c.isCritical('LOGIN_FAILED')).toBe(true);
      expect(c.isCritical('DEV_ELEVATION_COMPLETED')).toBe(true);
    });

    it('retorna false para eventos comuns', () => {
      const c = create({ showCriticalBadge: true });
      expect(c.isCritical('USER_LOGGED_IN')).toBe(false);
      expect(c.isCritical('USER_CREATED')).toBe(false);
      expect(c.isCritical('TOTP_ENABLED')).toBe(false);
    });
  });

  describe('rowClass()', () => {
    it('retorna classe de alerta para evento crítico quando showCriticalBadge=true', () => {
      const c = create({ showCriticalBadge: true });
      expect(c.rowClass('TOKEN_THEFT_DETECTED')).toContain('red-950');
    });

    it('retorna classe padrão para evento crítico quando showCriticalBadge=false', () => {
      const c = create({ showCriticalBadge: false });
      expect(c.rowClass('TOKEN_THEFT_DETECTED')).toContain('surface-hover');
    });

    it('retorna classe padrão para evento não-crítico', () => {
      const c = create({ showCriticalBadge: true });
      expect(c.rowClass('USER_LOGGED_IN')).toContain('surface-hover');
    });
  });
});
