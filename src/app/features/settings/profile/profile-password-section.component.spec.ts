import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProfilePasswordSectionComponent } from './profile-password-section.component';
import { AuthStore } from '../../../core/auth/auth.store';
import { ProfileService } from '../../../core/profile/profile.service';
import { CurrentUser } from '../../../core/auth/models/auth.models';

const MOCK_USER: CurrentUser = {
  id: 1,
  username: 'alice',
  email: 'alice@example.com',
  enabled: true,
  emailVerified: true,
  pendingEmail: null,
  totpEnabled: false,
  roles: [],
  permissions: [],
};

describe('ProfilePasswordSectionComponent', () => {
  let component: ProfilePasswordSectionComponent;
  let store: AuthStore;
  let profileService: jest.Mocked<Pick<ProfileService, 'changePassword'>>;
  let snackBar: jest.Mocked<Pick<MatSnackBar, 'open'>>;

  beforeEach(async () => {
    profileService = { changePassword: jest.fn().mockResolvedValue(undefined) };
    snackBar = { open: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [ProfilePasswordSectionComponent],
      providers: [
        { provide: ProfileService, useValue: profileService },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    })
      .overrideTemplate(ProfilePasswordSectionComponent, '')
      .compileComponents();

    store = TestBed.inject(AuthStore);
    store.setCurrentUser(MOCK_USER);

    const fixture = TestBed.createComponent(ProfilePasswordSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => localStorage.clear());

  function fillForm(currentPassword = 'old123', newPassword = 'New456!x') {
    component.passwordForm.setValue({
      currentPassword,
      newPassword,
      confirmPassword: newPassword,
    });
  }

  it('cria o componente', () => {
    expect(component).toBeTruthy();
  });

  describe('changePassword (sem TOTP)', () => {
    it('chama changePassword e exibe snackbar de sucesso', async () => {
      fillForm();
      await component.changePassword();
      await Promise.resolve();
      expect(profileService.changePassword).toHaveBeenCalledWith({
        currentPassword: 'old123',
        newPassword: 'New456!x',
        totpCode: undefined,
        revokeOtherSessions: false,
      });
      expect(snackBar.open).toHaveBeenCalledWith('Senha alterada com sucesso!', 'OK', { duration: 3000 });
      expect(component.saving()).toBe(false);
    });

    it('reseta o form após sucesso', async () => {
      fillForm();
      await component.changePassword();
      await Promise.resolve();
      expect(component.passwordForm.value.currentPassword).toBe('');
    });

    it('define passwordError "Senha atual incorreta." para 401', async () => {
      fillForm();
      profileService.changePassword.mockRejectedValue(new HttpErrorResponse({ status: 401 }));
      await component.changePassword();
      await Promise.resolve();
      expect(component.passwordError()).toBe('Senha atual incorreta.');
      expect(component.saving()).toBe(false);
    });

    it('define passwordError "Senha atual incorreta." para 403', async () => {
      fillForm();
      profileService.changePassword.mockRejectedValue(new HttpErrorResponse({ status: 403 }));
      await component.changePassword();
      await Promise.resolve();
      expect(component.passwordError()).toBe('Senha atual incorreta.');
    });

    it('define passwordError genérico para outros erros', async () => {
      fillForm();
      profileService.changePassword.mockRejectedValue(new Error('network'));
      await component.changePassword();
      await Promise.resolve();
      expect(component.passwordError()).toBe('Erro ao alterar senha. Tente novamente.');
    });

    it('não chama changePassword se o form for inválido', async () => {
      component.passwordForm.setValue({ currentPassword: '', newPassword: '', confirmPassword: '' });
      component.changePassword();
      expect(profileService.changePassword).not.toHaveBeenCalled();
    });
  });

  describe('changePassword (com TOTP)', () => {
    beforeEach(() => {
      store.setCurrentUser({ ...MOCK_USER, totpEnabled: true });
      TestBed.flushEffects();
    });

    it('abre o modal quando TOTP está ativo', () => {
      fillForm();
      component.changePassword();
      expect(component.showModal()).toBe(true);
    });

    it('onModalConfirmed chama changePassword com totpCode e revokeOtherSessions', async () => {
      fillForm();
      await component.onModalConfirmed({ totpCode: '123456', revokeOtherSessions: true });
      await Promise.resolve();
      expect(profileService.changePassword).toHaveBeenCalledWith({
        currentPassword: 'old123',
        newPassword: 'New456!x',
        totpCode: '123456',
        revokeOtherSessions: true,
      });
    });

    it('fecha o modal após sucesso', async () => {
      fillForm();
      component.showModal.set(true);
      await component.onModalConfirmed({ totpCode: '123456', revokeOtherSessions: false });
      await Promise.resolve();
      expect(component.showModal()).toBe(false);
    });
  });
});
