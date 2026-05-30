import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RegisterComponent } from './register.component';
import { environment } from '../../../../environments/environment';

const API = environment.apiUrl;

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let controller: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    })
      .overrideTemplate(RegisterComponent, '')
      .compileComponents();

    controller = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => controller.verify());

  it('define success=true após registro bem-sucedido', async () => {
    component.form.setValue({
      username: 'alice',
      email: 'alice@example.com',
      password: 'pass123',
      confirmPassword: 'pass123',
    });

    const promise = component.onSubmit();
    controller.expectOne(`${API}/auth/register`).flush({});
    await promise;

    expect(component.success()).toBe(true);
    expect(component.loading()).toBe(false);
  });

  it('define errorMsg de conflito para 409', async () => {
    component.form.setValue({
      username: 'alice',
      email: 'alice@example.com',
      password: 'pass123',
      confirmPassword: 'pass123',
    });

    const promise = component.onSubmit();
    controller
      .expectOne(`${API}/auth/register`)
      .flush({ message: 'Conflict' }, { status: 409, statusText: 'Conflict' });
    await promise;

    expect(component.errorMsg()).toBe('Usuário ou email já cadastrado.');
    expect(component.success()).toBe(false);
  });

  it('define errorMsg genérico para outros erros', async () => {
    component.form.setValue({
      username: 'alice',
      email: 'alice@example.com',
      password: 'pass123',
      confirmPassword: 'pass123',
    });

    const promise = component.onSubmit();
    controller
      .expectOne(`${API}/auth/register`)
      .flush({}, { status: 500, statusText: 'Server Error' });
    await promise;

    expect(component.errorMsg()).toBe('Erro ao criar conta. Tente novamente.');
  });

  it('não submete se o form for inválido', async () => {
    component.form.setValue({
      username: '',
      email: 'alice@example.com',
      password: 'pass123',
      confirmPassword: 'pass123',
    });

    await component.onSubmit();
    controller.expectNone(`${API}/auth/register`);
  });

  it('não submete se as senhas não coincidirem', async () => {
    component.form.setValue({
      username: 'alice',
      email: 'alice@example.com',
      password: 'pass123',
      confirmPassword: 'different',
    });

    await component.onSubmit();
    controller.expectNone(`${API}/auth/register`);
  });
});
