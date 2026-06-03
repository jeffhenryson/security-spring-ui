import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { TwoFactorComponent } from './two-factor.component';
import { AuthService } from '../../../core/auth/auth.service';

function makeRoute(returnUrl: string | null = null) {
  return {
    snapshot: {
      queryParamMap: { get: (_key: string) => returnUrl },
    },
  };
}

describe('TwoFactorComponent', () => {
  let component: TwoFactorComponent;
  let authService: jest.Mocked<Pick<AuthService, 'verify2FA' | 'consumePendingChallengeToken'>>;
  let router: jest.Mocked<Pick<Router, 'navigateByUrl'>>;

  async function setup(returnUrl: string | null = null) {
    return TestBed.configureTestingModule({
      imports: [TwoFactorComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: makeRoute(returnUrl) },
      ],
    })
      .overrideTemplate(TwoFactorComponent, '')
      .compileComponents();
  }

  beforeEach(() => {
    authService = {
      verify2FA: jest.fn().mockResolvedValue(undefined),
      consumePendingChallengeToken: jest.fn(),
    };
    router = { navigateByUrl: jest.fn() };
  });

  describe('quando há token pendente no AuthService', () => {
    beforeEach(async () => {
      authService.consumePendingChallengeToken.mockReturnValue('chal-abc');
      await setup();
      const fixture = TestBed.createComponent(TwoFactorComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('não marca sessão como expirada', () => {
      expect(component.sessionExpired()).toBe(false);
    });

    it('chama verify2FA com o token e o código, e redireciona para /app/dashboard', async () => {
      component.form.setValue({ code: '123456' });
      await component.onSubmit();

      expect(authService.verify2FA).toHaveBeenCalledWith({
        challengeToken: 'chal-abc',
        code: '123456',
      });
      expect(router.navigateByUrl).toHaveBeenCalledWith('/app/dashboard');
      expect(component.loading()).toBe(false);
    });

    it('define errorMsg e não redireciona em caso de falha', async () => {
      authService.verify2FA.mockRejectedValue(new Error('invalid'));
      component.form.setValue({ code: '999999' });
      await component.onSubmit();

      expect(component.errorMsg()).toBe('Código inválido ou expirado.');
      expect(router.navigateByUrl).not.toHaveBeenCalled();
      expect(component.loading()).toBe(false);
    });

    it('não chama verify2FA se o form for inválido', async () => {
      component.form.setValue({ code: '12' });
      await component.onSubmit();
      expect(authService.verify2FA).not.toHaveBeenCalled();
    });
  });

  describe('quando há returnUrl no query param', () => {
    beforeEach(async () => {
      authService.consumePendingChallengeToken.mockReturnValue('chal-xyz');
      await setup('/app/settings/profile');
      const fixture = TestBed.createComponent(TwoFactorComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('redireciona para o returnUrl após verificação bem-sucedida', async () => {
      component.form.setValue({ code: '123456' });
      await component.onSubmit();
      expect(router.navigateByUrl).toHaveBeenCalledWith('/app/settings/profile');
    });
  });

  describe('quando returnUrl é inválido (open redirect)', () => {
    beforeEach(async () => {
      authService.consumePendingChallengeToken.mockReturnValue('chal-xyz');
      await setup('//evil.com');
      const fixture = TestBed.createComponent(TwoFactorComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('redireciona para /app/dashboard ignorando URL externa', async () => {
      component.form.setValue({ code: '123456' });
      await component.onSubmit();
      expect(router.navigateByUrl).toHaveBeenCalledWith('/app/dashboard');
    });
  });

  describe('quando não há token pendente no AuthService', () => {
    beforeEach(async () => {
      authService.consumePendingChallengeToken.mockReturnValue(null);
      await setup();
      const fixture = TestBed.createComponent(TwoFactorComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('marca sessionExpired=true', () => {
      expect(component.sessionExpired()).toBe(true);
    });
  });
});
