import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { SecurityComponent } from './security.component';
import { AuthStore } from '../../../core/auth/auth.store';
import { AuthService } from '../../../core/auth/auth.service';
import { SecurityService } from '../../../core/security/security.service';
import { CurrentUser, SessionInfo } from '../../../core/auth/models/auth.models';

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mockqr'),
}));

const MOCK_USER: CurrentUser = {
  id: 1,
  username: 'alice',
  email: 'alice@example.com',
  enabled: true,
  emailVerified: true,
  pendingEmail: null,
  totpEnabled: false,
  roles: [],
  permissions: [],
};

const MOCK_SESSION: SessionInfo = {
  id: 10,
  createdAt: '2026-01-01T00:00:00Z',
  expiresAt: '2026-02-01T00:00:00Z',
  ipAddress: '127.0.0.1',
  userAgent: 'Mozilla/5.0',
};

describe('SecurityComponent', () => {
  let component: SecurityComponent;
  let store: AuthStore;
  let securityService: jest.Mocked<SecurityService>;
  let authService: jest.Mocked<Pick<AuthService, 'loadCurrentUser'>>;
  let snackBar: jest.Mocked<Pick<MatSnackBar, 'open'>>;
  let router: jest.Mocked<Pick<Router, 'navigate'>>;
  let dialog: jest.Mocked<Pick<MatDialog, 'open'>>;

  function makeDialogRef(result: unknown) {
    return { afterClosed: () => of(result) } as unknown as MatDialogRef<unknown>;
  }

  beforeEach(async () => {
    securityService = {
      loadSessions: jest.fn().mockResolvedValue([MOCK_SESSION]),
      terminateAllSessions: jest.fn().mockResolvedValue(undefined),
      terminateSession: jest.fn().mockResolvedValue(undefined),
      startTotpSetup: jest.fn().mockResolvedValue({ secret: 'ABCD', otpauthUri: 'otpauth://...' }),
      confirmTotpSetup: jest.fn().mockResolvedValue({ backupCodes: ['code1', 'code2'] }),
      disableTotp: jest.fn().mockResolvedValue(undefined),
      regenerateBackupCodes: jest.fn().mockResolvedValue({ backupCodes: ['new1', 'new2'] }),
    } as unknown as jest.Mocked<SecurityService>;

    authService = { loadCurrentUser: jest.fn().mockResolvedValue(undefined) };
    snackBar = { open: jest.fn() };
    router = { navigate: jest.fn() };
    dialog = { open: jest.fn().mockReturnValue(makeDialogRef(true)) };

    await TestBed.configureTestingModule({
      imports: [SecurityComponent],
      providers: [
        { provide: SecurityService, useValue: securityService },
        { provide: AuthService, useValue: authService },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: Router, useValue: router },
        { provide: MatDialog, useValue: dialog },
      ],
    })
      .overrideTemplate(SecurityComponent, '')
      .compileComponents();

    store = TestBed.inject(AuthStore);
    store.setCurrentUser(MOCK_USER);

    const fixture = TestBed.createComponent(SecurityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    // Wait for ngOnInit (loadSessions) to settle
    await Promise.resolve();
  });

  afterEach(() => localStorage.clear());

  // ── init ──────────────────────────────────────────────────────────────────

  it('carrega sessões no ngOnInit', async () => {
    expect(securityService.loadSessions).toHaveBeenCalled();
    expect(component.sessions()).toHaveLength(1);
    expect(component.loadingSessions()).toBe(false);
  });

  describe('quando loadSessions falha no init', () => {
    let failComp: SecurityComponent;

    beforeEach(async () => {
      securityService.loadSessions.mockRejectedValueOnce(new Error('network'));
      const fix = TestBed.createComponent(SecurityComponent);
      failComp = fix.componentInstance;
      fix.detectChanges();
      await Promise.resolve();
    });

    it('define sessions como [] e exibe snackbar de erro', () => {
      expect(failComp.sessions()).toHaveLength(0);
      expect(snackBar.open).toHaveBeenCalledWith(
        'Não foi possível carregar as sessões ativas.',
        'OK',
        { duration: 4000 },
      );
    });
  });

  // ── terminateSession ──────────────────────────────────────────────────────

  describe('terminateSession', () => {
    it('remove a sessão da lista e exibe snackbar', async () => {
      await component.terminateSession(MOCK_SESSION);
      expect(securityService.terminateSession).toHaveBeenCalledWith(10);
      expect(component.sessions()).toHaveLength(0);
      expect(snackBar.open).toHaveBeenCalledWith('Sessão encerrada.', 'OK', { duration: 2000 });
      expect(component.revokingId()).toBeNull();
    });

    it('exibe snackbar de erro e limpa revokingId se falhar', async () => {
      securityService.terminateSession.mockRejectedValue(new Error('fail'));
      await component.terminateSession(MOCK_SESSION);
      expect(component.sessions()).toHaveLength(1);
      expect(snackBar.open).toHaveBeenCalledWith(
        'Erro ao encerrar sessão. Tente novamente.',
        'OK',
        { duration: 3000 },
      );
      expect(component.revokingId()).toBeNull();
    });
  });

  // ── terminateAllSessions ──────────────────────────────────────────────────

  describe('terminateAllSessions', () => {
    it('redireciona para /auth/login após confirmar e encerrar todas as sessões', async () => {
      await component.terminateAllSessions();
      expect(securityService.terminateAllSessions).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
      expect(component.terminatingAll()).toBe(false);
    });

    it('não chama terminateAllSessions se o dialog for cancelado', async () => {
      dialog.open.mockReturnValue(makeDialogRef(false));
      await component.terminateAllSessions();
      expect(securityService.terminateAllSessions).not.toHaveBeenCalled();
    });

    it('exibe snackbar de erro e não redireciona se o serviço falhar', async () => {
      securityService.terminateAllSessions.mockRejectedValue(new Error('fail'));
      await component.terminateAllSessions();
      expect(router.navigate).not.toHaveBeenCalled();
      expect(snackBar.open).toHaveBeenCalledWith(
        'Erro ao encerrar sessões. Tente novamente.',
        'OK',
        { duration: 3000 },
      );
    });
  });

  // ── startSetup / cancelSetup ──────────────────────────────────────────────

  describe('startSetup', () => {
    it('muda a view para "setup-qr" e define secret/qrDataUrl', async () => {
      await component.startSetup();
      expect(component.totpView()).toBe('setup-qr');
      expect(component.totpSecret()).toBe('ABCD');
      expect(component.qrDataUrl()).toBe('data:image/png;base64,mockqr');
      expect(component.totpLoading()).toBe(false);
    });

    it('define totpError "2FA já está ativado" para 409', async () => {
      securityService.startTotpSetup.mockRejectedValue(new HttpErrorResponse({ status: 409 }));
      await component.startSetup();
      expect(component.totpError()).toBe(
        '2FA já está ativado. Desative-o antes de reconfigurar.',
      );
      expect(component.totpView()).toBe('idle');
    });

    it('define totpError genérico para outros erros', async () => {
      securityService.startTotpSetup.mockRejectedValue(new Error('network'));
      await component.startSetup();
      expect(component.totpError()).toBe('Erro ao iniciar configuração. Tente novamente.');
    });
  });

  describe('cancelSetup', () => {
    it('reseta a view para "idle" e limpa campos de setup', async () => {
      await component.startSetup();
      component.cancelSetup();
      expect(component.totpView()).toBe('idle');
      expect(component.totpSecret()).toBe('');
      expect(component.qrDataUrl()).toBe('');
      expect(component.totpError()).toBe('');
    });
  });

  // ── confirmSetup ──────────────────────────────────────────────────────────

  describe('confirmSetup', () => {
    beforeEach(() => {
      component.confirmForm.setValue({ code: '123456' });
    });

    it('muda a view para "backup-codes" e define os códigos', async () => {
      await component.confirmSetup();
      expect(securityService.confirmTotpSetup).toHaveBeenCalledWith('123456');
      expect(component.totpView()).toBe('backup-codes');
      expect(component.backupCodes()).toEqual(['code1', 'code2']);
      expect(component.totpLoading()).toBe(false);
    });

    it('exibe snackbar de sucesso ao confirmar 2FA', async () => {
      await component.confirmSetup();
      expect(snackBar.open).toHaveBeenCalledWith('2FA habilitado com sucesso!', 'OK', {
        duration: 3000,
      });
    });

    it('define totpError para código inválido', async () => {
      securityService.confirmTotpSetup.mockRejectedValue(new Error('invalid'));
      await component.confirmSetup();
      expect(component.totpError()).toBe('Código inválido ou expirado. Tente novamente.');
    });

    it('não chama confirmTotpSetup se o form for inválido', async () => {
      component.confirmForm.setValue({ code: '' });
      await component.confirmSetup();
      expect(securityService.confirmTotpSetup).not.toHaveBeenCalled();
    });
  });

  // ── disableTotp ───────────────────────────────────────────────────────────

  describe('disableTotp', () => {
    beforeEach(() => {
      component.disableForm.setValue({ currentPassword: 'pass123', code: '654321' });
    });

    it('desabilita 2FA, reseta view e exibe snackbar', async () => {
      await component.disableTotp();
      expect(securityService.disableTotp).toHaveBeenCalledWith({
        currentPassword: 'pass123',
        code: '654321',
      });
      expect(component.totpView()).toBe('idle');
      expect(snackBar.open).toHaveBeenCalledWith('2FA desabilitado.', 'OK', { duration: 3000 });
      expect(component.totpLoading()).toBe(false);
    });

    it('define totpError "Senha ou código inválido." para 401', async () => {
      securityService.disableTotp.mockRejectedValue(new HttpErrorResponse({ status: 401 }));
      await component.disableTotp();
      expect(component.totpError()).toBe('Senha ou código inválido.');
    });

    it('define totpError genérico para outros erros', async () => {
      securityService.disableTotp.mockRejectedValue(new Error('network'));
      await component.disableTotp();
      expect(component.totpError()).toBe('Erro ao desabilitar. Tente novamente.');
    });
  });

  // ── confirmRegenBackupCodes ───────────────────────────────────────────────

  describe('confirmRegenBackupCodes', () => {
    beforeEach(() => {
      component.regenForm.setValue({ currentPassword: 'myPass123' });
    });

    it('define novos backup codes e muda a view para "backup-codes"', async () => {
      await component.confirmRegenBackupCodes();
      expect(securityService.regenerateBackupCodes).toHaveBeenCalledWith('myPass123');
      expect(component.backupCodes()).toEqual(['new1', 'new2']);
      expect(component.totpView()).toBe('backup-codes');
      expect(snackBar.open).toHaveBeenCalledWith('Novos backup codes gerados!', 'OK', {
        duration: 3000,
      });
      expect(component.totpLoading()).toBe(false);
    });

    it('define totpError "Senha incorreta." para 401', async () => {
      securityService.regenerateBackupCodes.mockRejectedValue(new HttpErrorResponse({ status: 401 }));
      await component.confirmRegenBackupCodes();
      expect(component.totpError()).toBe('Senha incorreta.');
    });

    it('define totpError genérico para outros erros', async () => {
      securityService.regenerateBackupCodes.mockRejectedValue(new Error('fail'));
      await component.confirmRegenBackupCodes();
      expect(component.totpError()).toBe('Erro ao regenerar backup codes. Tente novamente.');
    });

    it('não chama o serviço se o form for inválido', async () => {
      component.regenForm.setValue({ currentPassword: '' });
      await component.confirmRegenBackupCodes();
      expect(securityService.regenerateBackupCodes).not.toHaveBeenCalled();
    });
  });
});
