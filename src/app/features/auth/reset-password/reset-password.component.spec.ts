import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ResetPasswordComponent } from './reset-password.component';
import { environment } from '../../../../environments/environment';

const API = environment.apiUrl;

function makeRoute(params: Record<string, string>) {
  return {
    snapshot: { queryParamMap: { get: (key: string) => params[key] ?? null } },
  };
}

describe('ResetPasswordComponent', () => {
  let component: ResetPasswordComponent;
  let controller: HttpTestingController;

  function setup(params: Record<string, string> = { token: 'valid-token' }) {
    return TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: makeRoute(params) },
      ],
    })
      .overrideTemplate(ResetPasswordComponent, '')
      .compileComponents();
  }

  afterEach(() => {
    controller?.verify();
  });

  describe('quando há um token válido na URL', () => {
    beforeEach(async () => {
      await setup({ token: 'valid-token' });
      controller = TestBed.inject(HttpTestingController);
      const fixture = TestBed.createComponent(ResetPasswordComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('não define tokenMissing', () => {
      expect(component.tokenMissing()).toBe(false);
    });

    it('define success=true após redefinir senha com sucesso', async () => {
      component.form.setValue({ newPassword: 'new456!', confirmPassword: 'new456!' });

      const promise = component.onSubmit();
      controller
        .expectOne(`${API}/auth/reset-password`)
        .flush({});
      await promise;

      expect(component.success()).toBe(true);
      expect(component.loading()).toBe(false);
    });

    it('define errorMsg em caso de falha', async () => {
      component.form.setValue({ newPassword: 'new456!', confirmPassword: 'new456!' });

      const promise = component.onSubmit();
      controller
        .expectOne(`${API}/auth/reset-password`)
        .flush({}, { status: 400, statusText: 'Bad Request' });
      await promise;

      expect(component.errorMsg()).toBe('Token inválido ou expirado.');
      expect(component.success()).toBe(false);
    });

    it('não submete se as senhas não coincidirem', async () => {
      component.form.setValue({ newPassword: 'abc123', confirmPassword: 'different' });

      await component.onSubmit();
      controller.expectNone(`${API}/auth/reset-password`);
    });
  });

  describe('quando não há token na URL', () => {
    beforeEach(async () => {
      await setup({});
      controller = TestBed.inject(HttpTestingController);
      const fixture = TestBed.createComponent(ResetPasswordComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('define tokenMissing=true', () => {
      expect(component.tokenMissing()).toBe(true);
    });
  });
});
