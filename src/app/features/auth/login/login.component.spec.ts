import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
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
  let router: jest.Mocked<Pick<Router, 'navigate'>>;

  beforeEach(async () => {
    authService = {
      login: jest.fn().mockResolvedValue(TOKEN_PAIR),
      setPendingChallengeToken: jest.fn(),
    };
    router = { navigate: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    })
      .overrideTemplate(LoginComponent, '')
      .compileComponents();

    const fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('redireciona para /app/dashboard após login bem-sucedido', async () => {
    component.form.setValue({ username: 'alice', password: 'secret' });
    await component.onSubmit();
    expect(authService.login).toHaveBeenCalledWith({ username: 'alice', password: 'secret' });
    expect(router.navigate).toHaveBeenCalledWith(['/app/dashboard']);
    expect(component.loading()).toBe(false);
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
    expect(router.navigate).not.toHaveBeenCalled();
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
