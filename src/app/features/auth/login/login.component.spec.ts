import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/auth/auth.service';

const TOKEN_PAIR = {
  accessToken: 'tok',
  tokenType: 'Bearer' as const,
  expiresIn: 3600,
};

const CHALLENGE = {
  status: 'PENDING_2FA' as const,
  challengeToken: 'chal-xyz',
  expiresInSeconds: 300,
};

describe('LoginComponent', () => {
  let component: LoginComponent;
  let authService: jest.Mocked<Pick<AuthService, 'login' | 'setPendingChallengeToken'>>;
  let router: jest.Mocked<Pick<Router, 'navigate' | 'navigateByUrl'>>;
  // Mutable — cada teste pode sobrescrever returnUrl antes de criar o componente
  const routeMock = {
    snapshot: { queryParamMap: { get: (_key: string) => null as string | null } },
  };

  beforeEach(async () => {
    routeMock.snapshot.queryParamMap.get = () => null;
    authService = {
      login: jest.fn().mockResolvedValue(TOKEN_PAIR),
      setPendingChallengeToken: jest.fn(),
    };
    router = { navigate: jest.fn(), navigateByUrl: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: routeMock },
      ],
    })
      .overrideTemplate(LoginComponent, '')
      .compileComponents();

    const fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('redireciona para /app/dashboard após login sem returnUrl', async () => {
    component.form.setValue({ username: 'alice', password: 'secret' });
    await component.onSubmit();
    expect(authService.login).toHaveBeenCalledWith({ username: 'alice', password: 'secret' });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/app/dashboard');
    expect(component.loading()).toBe(false);
  });

  it('redireciona para returnUrl válido após login', async () => {
    routeMock.snapshot.queryParamMap.get = (k) => (k === 'returnUrl' ? '/app/settings/users' : null);
    component.form.setValue({ username: 'alice', password: 'secret' });
    await component.onSubmit();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/app/settings/users');
  });

  it('ignora returnUrl externo (open redirect) e usa /app/dashboard', async () => {
    routeMock.snapshot.queryParamMap.get = (k) => (k === 'returnUrl' ? '//evil.com' : null);
    component.form.setValue({ username: 'alice', password: 'secret' });
    await component.onSubmit();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/app/dashboard');
  });

  it('armazena challengeToken no serviço e redireciona para /auth/2fa quando 2FA é necessário', async () => {
    authService.login.mockResolvedValue(CHALLENGE);
    component.form.setValue({ username: 'alice', password: 'secret' });
    await component.onSubmit();
    expect(authService.setPendingChallengeToken).toHaveBeenCalledWith('chal-xyz');
    expect(router.navigate).toHaveBeenCalledWith(['/auth/2fa']);
  });

  it('define errorMsg e não redireciona em caso de falha', async () => {
    authService.login.mockRejectedValue(new Error('unauthorized'));
    component.form.setValue({ username: 'alice', password: 'wrong' });
    await component.onSubmit();
    expect(component.errorMsg()).toBe('Usuário ou senha inválidos.');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(component.loading()).toBe(false);
  });

  it('não chama login se o form for inválido', async () => {
    component.form.setValue({ username: '', password: '' });
    await component.onSubmit();
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('bloqueia após 5 tentativas e limpa errorMsg', async () => {
    authService.login.mockRejectedValue(new Error('unauthorized'));
    component.form.setValue({ username: 'alice', password: 'wrong' });
    for (let i = 0; i < 5; i++) {
      await component.onSubmit();
    }
    expect(component.lockedUntil()).toBeGreaterThan(Date.now());
    expect(component.errorMsg()).toBe('');
  });
});
