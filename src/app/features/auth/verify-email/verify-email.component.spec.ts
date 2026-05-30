import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { VerifyEmailComponent } from './verify-email.component';
import { AuthService } from '../../../core/auth/auth.service';

function makeRoute(params: Record<string, string>) {
  return {
    snapshot: { queryParamMap: { get: (key: string) => params[key] ?? null } },
  };
}

function makeAuthService(opts: {
  verifyEmail?: () => Promise<void>;
  resendVerification?: () => Promise<void>;
}): jest.Mocked<Pick<AuthService, 'verifyEmail' | 'resendVerification'>> {
  return {
    verifyEmail: jest.fn(opts.verifyEmail ?? (() => Promise.resolve())),
    resendVerification: jest.fn(opts.resendVerification ?? (() => Promise.resolve())),
  };
}

describe('VerifyEmailComponent', () => {
  let component: VerifyEmailComponent;

  function setup(
    params: Record<string, string>,
    authService: ReturnType<typeof makeAuthService>,
  ) {
    TestBed.configureTestingModule({
      imports: [VerifyEmailComponent],
      providers: [
        { provide: ActivatedRoute, useValue: makeRoute(params) },
        { provide: AuthService, useValue: authService },
      ],
    }).overrideTemplate(VerifyEmailComponent, '');
    const fixture = TestBed.createComponent(VerifyEmailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    return fixture;
  }

  // ── auto-verify (token em query param) ───────────────────────────────────

  describe('quando há "code" na URL (auto-verify)', () => {
    it('muda viewState para "success" após verificação automática', async () => {
      const auth = makeAuthService({ verifyEmail: () => Promise.resolve() });
      setup({ code: 'auto-code' }, auth);
      await Promise.resolve();

      expect(auth.verifyEmail).toHaveBeenCalledWith('auto-code');
      expect(component.viewState()).toBe('success');
    });

    it('muda viewState para "manual-form" com verifyError=true se a verificação automática falhar', async () => {
      const auth = makeAuthService({ verifyEmail: () => Promise.reject(new Error('bad')) });
      setup({ code: 'bad-code' }, auth);
      await Promise.resolve();

      expect(component.viewState()).toBe('manual-form');
      expect(component.verifyError()).toBe(true);
    });
  });

  // ── sem código — formulário manual ───────────────────────────────────────

  describe('quando não há "code" na URL (formulário manual)', () => {
    let auth: ReturnType<typeof makeAuthService>;

    beforeEach(async () => {
      auth = makeAuthService({});
      setup({ email: 'alice@example.com' }, auth);
    });

    it('exibe o formulário manual imediatamente', () => {
      expect(component.viewState()).toBe('manual-form');
      expect(component.verifyError()).toBe(false);
    });

    it('onManualSubmit: muda para "success" em caso de sucesso', async () => {
      component.form.setValue({ code: 'manual-code' });
      await component.onManualSubmit();

      expect(component.viewState()).toBe('success');
      expect(component.loadingManual()).toBe(false);
    });

    it('onManualSubmit: define formErrorMsg em caso de falha', async () => {
      auth.verifyEmail.mockRejectedValueOnce(new Error('bad'));
      component.form.setValue({ code: 'bad-code' });
      await component.onManualSubmit();

      expect(component.formErrorMsg()).toBe('Código inválido ou expirado.');
      expect(component.viewState()).toBe('manual-form');
    });

    it('onManualSubmit: não submete se o form for inválido', async () => {
      component.form.setValue({ code: '' });
      await component.onManualSubmit();
      expect(auth.verifyEmail).not.toHaveBeenCalled();
    });

    it('resendCode: define resendSent=true após sucesso', async () => {
      await component.resendCode();

      expect(component.resendSent()).toBe(true);
      expect(component.loadingResend()).toBe(false);
    });

    it('resendCode: define resendError em caso de falha', async () => {
      auth.resendVerification.mockRejectedValueOnce(new Error('err'));
      await component.resendCode();

      expect(component.resendError()).toBe('Não foi possível reenviar. Tente novamente.');
      expect(component.resendSent()).toBe(false);
    });
  });
});
