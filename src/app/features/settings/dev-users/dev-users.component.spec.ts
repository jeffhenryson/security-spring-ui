import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DevUsersComponent } from './dev-users.component';
import { UsersAdminService } from '../../../core/admin/users-admin.service';
import { DevService } from '../../../core/dev/dev.service';
import { AuthStore } from '../../../core/auth/auth.store';

function makeStore(): Partial<AuthStore> {
  return { setDevToken: jest.fn() } as unknown as Partial<AuthStore>;
}

describe('DevUsersComponent', () => {
  let component: DevUsersComponent;
  let devService: jest.Mocked<DevService>;
  let usersService: jest.Mocked<UsersAdminService>;
  let snackBar: { open: jest.Mock };

  beforeEach(async () => {
    devService = {
      firstCode: jest.fn().mockResolvedValue({ devToken: 'tok', expiresIn: 90 }),
      complete: jest.fn().mockResolvedValue({ accessToken: 'at', expiresIn: 3600 }),
    } as unknown as jest.Mocked<DevService>;

    usersService = {
      create: jest.fn().mockResolvedValue({ id: 1, username: 'devuser', email: '', enabled: true, roles: [], createdAt: '' }),
      assignRole: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<UsersAdminService>;

    snackBar = { open: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [DevUsersComponent],
      providers: [
        { provide: DevService, useValue: devService },
        { provide: UsersAdminService, useValue: usersService },
        { provide: AuthStore, useValue: makeStore() },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    })
      .overrideTemplate(DevUsersComponent, '')
      .compileComponents();

    const fixture = TestBed.createComponent(DevUsersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('cria o componente', () => {
    expect(component).toBeTruthy();
  });

  it('step inicial é "form"', () => {
    expect(component.step()).toBe('form');
  });

  it('goToTotp1() avança para totp1 quando formulário é válido', () => {
    component.form.setValue({ username: 'devuser', email: '', password: 'Pass@1234', confirmed: true });
    component.goToTotp1();
    expect(component.step()).toBe('totp1');
  });

  it('goToTotp1() não avança quando formulário é inválido', () => {
    component.goToTotp1();
    expect(component.step()).toBe('form');
  });

  it('stepDone() retorna false para step atual', () => {
    expect(component.stepDone('form')).toBe(false);
  });

  it('stepDone() retorna true para steps anteriores', () => {
    component.form.setValue({ username: 'devuser', email: '', password: 'Pass@1234', confirmed: true });
    component.goToTotp1();
    expect(component.stepDone('form')).toBe(true);
    expect(component.stepDone('totp1')).toBe(false);
  });

  it('submitTotp1() chama devService.firstCode e avança para totp2', async () => {
    component.code1.set('123456');
    await component.submitTotp1();
    expect(devService.firstCode).toHaveBeenCalledWith('123456');
    expect(component.step()).toBe('totp2');
    expect(component.devToken()).toBe('tok');
  });

  it('submitTotp1() exibe erro e mantém o step quando o serviço falha', async () => {
    // Avança para totp1 primeiro
    component.form.setValue({ username: 'devuser', email: '', password: 'Pass@1234', confirmed: true });
    component.goToTotp1();
    devService.firstCode.mockRejectedValueOnce(new Error('invalid'));
    component.code1.set('999999');
    await component.submitTotp1();
    expect(component.error()).toBeTruthy();
    expect(component.step()).toBe('totp1');
  });

  it('step2Expired() é false quando há tempo restante', () => {
    component.step2SecondsLeft.set(30);
    expect(component.step2Expired()).toBe(false);
  });

  it('step2Expired() é true quando timer expirou', () => {
    component.step2SecondsLeft.set(0);
    expect(component.step2Expired()).toBe(true);
  });

  it('reset() volta para o step "form"', () => {
    component.form.setValue({ username: 'devuser', email: '', password: 'Pass@1234', confirmed: true });
    component.goToTotp1();
    component.reset();
    expect(component.step()).toBe('form');
  });
});
