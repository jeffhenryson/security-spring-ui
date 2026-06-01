import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { RegisterComponent } from './register.component';
import { AuthService } from '../../../core/auth/auth.service';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let authService: jest.Mocked<Pick<AuthService, 'register'>>;

  beforeEach(async () => {
    authService = { register: jest.fn().mockResolvedValue(undefined) };

    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [{ provide: AuthService, useValue: authService }],
    })
      .overrideTemplate(RegisterComponent, '')
      .compileComponents();

    const fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('define success=true após registro bem-sucedido', async () => {
    component.form.setValue({
      username: 'alice',
      email: 'alice@example.com',
      password: 'Pass@1234',
      confirmPassword: 'Pass@1234',
    });

    await component.onSubmit();

    expect(authService.register).toHaveBeenCalledWith('alice', 'alice@example.com', 'Pass@1234');
    expect(component.success()).toBe(true);
    expect(component.loading()).toBe(false);
  });

  it('define errorMsg de conflito para 409', async () => {
    authService.register.mockRejectedValue(new HttpErrorResponse({ status: 409 }));
    component.form.setValue({
      username: 'alice',
      email: 'alice@example.com',
      password: 'Pass@1234',
      confirmPassword: 'Pass@1234',
    });

    await component.onSubmit();

    expect(component.errorMsg()).toBe('Usuário ou email já cadastrado.');
    expect(component.success()).toBe(false);
    expect(component.loading()).toBe(false);
  });

  it('define errorMsg genérico para outros erros', async () => {
    authService.register.mockRejectedValue(new Error('Server Error'));
    component.form.setValue({
      username: 'alice',
      email: 'alice@example.com',
      password: 'Pass@1234',
      confirmPassword: 'Pass@1234',
    });

    await component.onSubmit();

    expect(component.errorMsg()).toBe('Erro ao criar conta. Tente novamente.');
  });

  it('não submete se o form for inválido (username vazio)', async () => {
    component.form.setValue({
      username: '',
      email: 'alice@example.com',
      password: 'Pass@1234',
      confirmPassword: 'Pass@1234',
    });

    await component.onSubmit();

    expect(authService.register).not.toHaveBeenCalled();
  });

  it('não submete se as senhas não coincidirem', async () => {
    component.form.setValue({
      username: 'alice',
      email: 'alice@example.com',
      password: 'Pass@1234',
      confirmPassword: 'Different@1',
    });

    await component.onSubmit();

    expect(authService.register).not.toHaveBeenCalled();
  });

  it('não submete se a senha for muito curta (< 8 chars)', async () => {
    component.form.setValue({
      username: 'alice',
      email: 'alice@example.com',
      password: 'P@ss1',
      confirmPassword: 'P@ss1',
    });

    await component.onSubmit();

    expect(authService.register).not.toHaveBeenCalled();
  });
});
