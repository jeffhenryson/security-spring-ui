import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ForgotPasswordComponent } from './forgot-password.component';
import { environment } from '../../../../environments/environment';

const API = environment.apiUrl;

describe('ForgotPasswordComponent', () => {
  let component: ForgotPasswordComponent;
  let controller: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    })
      .overrideTemplate(ForgotPasswordComponent, '')
      .compileComponents();

    controller = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ForgotPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => controller.verify());

  it('define sent=true após envio bem-sucedido', async () => {
    component.form.setValue({ email: 'alice@example.com' });

    const promise = component.onSubmit();
    controller.expectOne(`${API}/auth/forgot-password`).flush({});
    await promise;

    expect(component.sent()).toBe(true);
    expect(component.loading()).toBe(false);
  });

  it('define sent=true mesmo quando o backend retorna erro (evita enumerar emails)', async () => {
    component.form.setValue({ email: 'unknown@example.com' });

    const promise = component.onSubmit();
    controller
      .expectOne(`${API}/auth/forgot-password`)
      .flush({}, { status: 404, statusText: 'Not Found' });
    await promise;

    expect(component.sent()).toBe(true);
    expect(component.loading()).toBe(false);
  });

  it('não submete se o form for inválido', async () => {
    component.form.setValue({ email: 'not-an-email' });

    await component.onSubmit();
    controller.expectNone(`${API}/auth/forgot-password`);
  });
});
