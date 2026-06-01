import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TotpComponent } from './totp.component';
import { AuthStore } from '../../../../core/auth/auth.store';
import { AuthService } from '../../../../core/auth/auth.service';
import { SecurityService } from '../../../../core/security/security.service';
import { CurrentUser } from '../../../../core/auth/models/auth.models';

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

describe('TotpComponent', () => {
  let component: TotpComponent;
  let store: AuthStore;
  let securityService: jest.Mocked<SecurityService>;
  let authService: jest.Mocked<Pick<AuthService, 'loadCurrentUser'>>;
  let snackBar: jest.Mocked<Pick<MatSnackBar, 'open'>>;

  beforeEach(async () => {
    securityService = {
      startTotpSetup: jest.fn().mockResolvedValue({ secret: 'ABCD', otpauthUri: 'otpauth://...' }),
      confirmTotpSetup: jest.fn().mockResolvedValue({ backupCodes: ['code1', 'code2'] }),
      disableTotp: jest.fn().mockResolvedValue(undefined),
      regenerateBackupCodes: jest.fn().mockResolvedValue({ backupCodes: ['new1', 'new2'] }),
    } as unknown as jest.Mocked<SecurityService>;

    authService = { loadCurrentUser: jest.fn().mockResolvedValue(undefined) };
    snackBar = { open: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [TotpComponent],
      providers: [
        { provide: SecurityService, useValue: securityService },
        { provide: AuthService, useValue: authService },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    })
      .overrideTemplate(TotpComponent, '')
      .compileComponents();

    store = TestBed.inject(AuthStore);
    store.setCurrentUser(MOCK_USER);

    const fixture = TestBed.createComponent(TotpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => localStorage.clear());

  describe('startSetup', () => {
    it('muda a view para "setup-qr" e define secret/qrDataUrl', async () => {
      await component.startSetup();
      expect(component.view()).toBe('setup-qr');
      expect(component.secret()).toBe('ABCD');
      expect(component.qrDataUrl()).toBe('data:image/png;base64,mockqr');
      expect(component.loading()).toBe(false);
    });

    it('define error "2FA já está ativado" para 409', async () => {
      securityService.startTotpSetup.mockRejectedValue(new HttpErrorResponse({ status: 409 }));
      await component.startSetup();
      expect(component.error()).toBe('2FA já está ativado. Desative-o antes de reconfigurar.');
      expect(component.view()).toBe('idle');
    });

    it('define error genérico para outros erros', async () => {
      securityService.startTotpSetup.mockRejectedValue(new Error('network'));
      await component.startSetup();
      expect(component.error()).toBe('Erro ao iniciar configuração. Tente novamente.');
    });
  });

  describe('cancelSetup', () => {
    it('reseta a view para "idle" e limpa campos', async () => {
      await component.startSetup();
      component.cancelSetup();
      expect(component.view()).toBe('idle');
      expect(component.secret()).toBe('');
      expect(component.qrDataUrl()).toBe('');
      expect(component.error()).toBe('');
    });
  });

  describe('confirmSetup', () => {
    beforeEach(() => {
      component.confirmForm.setValue({ code: '123456' });
    });

    it('muda a view para "backup-codes" e define os códigos', async () => {
      await component.confirmSetup();
      expect(securityService.confirmTotpSetup).toHaveBeenCalledWith('123456');
      expect(component.view()).toBe('backup-codes');
      expect(component.backupCodes()).toEqual(['code1', 'code2']);
      expect(component.loading()).toBe(false);
    });

    it('exibe snackbar de sucesso ao confirmar 2FA', async () => {
      await component.confirmSetup();
      expect(snackBar.open).toHaveBeenCalledWith('2FA habilitado com sucesso!', 'OK', {
        duration: 3000,
      });
    });

    it('define error para código inválido', async () => {
      securityService.confirmTotpSetup.mockRejectedValue(new Error('invalid'));
      await component.confirmSetup();
      expect(component.error()).toBe('Código inválido ou expirado. Tente novamente.');
    });

    it('não chama confirmTotpSetup se o form for inválido', async () => {
      component.confirmForm.setValue({ code: '' });
      await component.confirmSetup();
      expect(securityService.confirmTotpSetup).not.toHaveBeenCalled();
    });
  });

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
      expect(component.view()).toBe('idle');
      expect(snackBar.open).toHaveBeenCalledWith('2FA desabilitado.', 'OK', { duration: 3000 });
      expect(component.loading()).toBe(false);
    });

    it('define error "Senha ou código inválido." para 401', async () => {
      securityService.disableTotp.mockRejectedValue(new HttpErrorResponse({ status: 401 }));
      await component.disableTotp();
      expect(component.error()).toBe('Senha ou código inválido.');
    });

    it('define error genérico para outros erros', async () => {
      securityService.disableTotp.mockRejectedValue(new Error('network'));
      await component.disableTotp();
      expect(component.error()).toBe('Erro ao desabilitar. Tente novamente.');
    });
  });

  describe('confirmRegenBackupCodes', () => {
    beforeEach(() => {
      component.regenForm.setValue({ currentPassword: 'myPass123' });
    });

    it('define novos backup codes e muda a view para "backup-codes"', async () => {
      await component.confirmRegenBackupCodes();
      expect(securityService.regenerateBackupCodes).toHaveBeenCalledWith('myPass123');
      expect(component.backupCodes()).toEqual(['new1', 'new2']);
      expect(component.view()).toBe('backup-codes');
      expect(snackBar.open).toHaveBeenCalledWith('Novos backup codes gerados!', 'OK', {
        duration: 3000,
      });
      expect(component.loading()).toBe(false);
    });

    it('define error "Senha incorreta." para 401', async () => {
      securityService.regenerateBackupCodes.mockRejectedValue(
        new HttpErrorResponse({ status: 401 }),
      );
      await component.confirmRegenBackupCodes();
      expect(component.error()).toBe('Senha incorreta.');
    });

    it('define error genérico para outros erros', async () => {
      securityService.regenerateBackupCodes.mockRejectedValue(new Error('fail'));
      await component.confirmRegenBackupCodes();
      expect(component.error()).toBe('Erro ao regenerar backup codes. Tente novamente.');
    });

    it('não chama o serviço se o form for inválido', async () => {
      component.regenForm.setValue({ currentPassword: '' });
      await component.confirmRegenBackupCodes();
      expect(securityService.regenerateBackupCodes).not.toHaveBeenCalled();
    });
  });
});
