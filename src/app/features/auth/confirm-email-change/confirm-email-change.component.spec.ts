import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { ConfirmEmailChangeComponent } from './confirm-email-change.component';
import { AuthService } from '../../../core/auth/auth.service';

function makeRoute(params: Record<string, string>) {
  return {
    snapshot: { queryParamMap: { get: (key: string) => params[key] ?? null } },
  };
}

function makeAuthService(opts: { confirmEmailChange: () => Promise<void> }) {
  return { confirmEmailChange: jest.fn(opts.confirmEmailChange) } as unknown as AuthService;
}

describe('ConfirmEmailChangeComponent', () => {
  let component: ConfirmEmailChangeComponent;

  function setup(params: Record<string, string>, authService: Partial<AuthService>) {
    TestBed.configureTestingModule({
      imports: [ConfirmEmailChangeComponent],
      providers: [
        { provide: ActivatedRoute, useValue: makeRoute(params) },
        { provide: AuthService, useValue: authService },
      ],
    }).overrideTemplate(ConfirmEmailChangeComponent, '');
    const fixture = TestBed.createComponent(ConfirmEmailChangeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    return fixture;
  }

  describe('quando há "code" na URL', () => {
    it('define success=true após confirmação bem-sucedida', async () => {
      const auth = makeAuthService({ confirmEmailChange: () => Promise.resolve() });
      setup({ code: 'confirm-code' }, auth);
      await Promise.resolve();

      expect(auth.confirmEmailChange).toHaveBeenCalledWith('confirm-code');
      expect(component.success()).toBe(true);
      expect(component.loading()).toBe(false);
    });

    it('mantém success=false e define loading=false em caso de falha', async () => {
      const auth = makeAuthService({ confirmEmailChange: () => Promise.reject(new Error('bad')) });
      setup({ code: 'bad-code' }, auth);
      await Promise.resolve();

      expect(component.success()).toBe(false);
      expect(component.loading()).toBe(false);
    });
  });

  describe('quando não há "code" na URL', () => {
    it('define errorMsg específica e loading=false imediatamente', () => {
      const auth = makeAuthService({ confirmEmailChange: () => Promise.resolve() });
      setup({}, auth);

      expect(component.loading()).toBe(false);
      expect(component.success()).toBe(false);
      expect(component.errorMsg()).toBe('Nenhum código de confirmação encontrado no link.');
    });
  });
});
