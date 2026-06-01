import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProfileComponent } from './profile.component';
import { AuthStore } from '../../../core/auth/auth.store';
import { AuthService } from '../../../core/auth/auth.service';
import { AvatarService } from '../../../core/auth/avatar.service';
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

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let store: AuthStore;
  let profileService: jest.Mocked<ProfileService>;
  let authService: jest.Mocked<Pick<AuthService, 'loadCurrentUser'>>;
  let snackBar: jest.Mocked<Pick<MatSnackBar, 'open'>>;

  beforeEach(async () => {
    profileService = {
      updateProfile: jest.fn().mockResolvedValue(undefined),
      changePassword: jest.fn().mockResolvedValue(undefined),
      uploadAvatar: jest.fn().mockResolvedValue(undefined),
      deleteAvatar: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ProfileService>;

    authService = { loadCurrentUser: jest.fn().mockResolvedValue(undefined) };
    snackBar = { open: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        { provide: ProfileService, useValue: profileService },
        { provide: AuthService, useValue: authService },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    })
      .overrideTemplate(ProfileComponent, '')
      .compileComponents();

    store = TestBed.inject(AuthStore);
    store.setCurrentUser(MOCK_USER);

    const fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => localStorage.clear());

  // ── effect: auto-fill form ────────────────────────────────────────────────

  it('preenche o form com dados do usuário atual via effect', () => {
    expect(component.profileForm.value.username).toBe('alice');
    expect(component.profileForm.value.email).toBe('alice@example.com');
  });

  it('não sobrescreve o form quando ele está sujo (dirty)', () => {
    component.profileForm.markAsDirty();
    store.setCurrentUser({ ...MOCK_USER, username: 'bob' });
    // form still has alice because effect skips when not pristine
    expect(component.profileForm.value.username).toBe('alice');
  });

  // ── saveProfile ───────────────────────────────────────────────────────────

  describe('saveProfile', () => {
    it('chama updateProfile e exibe snackbar de sucesso', async () => {
      await component.saveProfile();
      expect(profileService.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'alice', email: 'alice@example.com' }),
      );
      expect(snackBar.open).toHaveBeenCalledWith('Perfil atualizado!', 'OK', { duration: 3000 });
      expect(component.saving()).toBe(false);
    });

    it('chama loadCurrentUser após salvar com sucesso', async () => {
      await component.saveProfile();
      expect(authService.loadCurrentUser).toHaveBeenCalled();
    });

    it('define profileError "Senha atual incorreta." para 401', async () => {
      profileService.updateProfile.mockRejectedValue(new HttpErrorResponse({ status: 401 }));
      await component.saveProfile();
      expect(component.profileError()).toBe('Senha atual incorreta.');
      expect(component.saving()).toBe(false);
    });

    it('define profileError "Senha atual incorreta." para 403', async () => {
      profileService.updateProfile.mockRejectedValue(new HttpErrorResponse({ status: 403 }));
      await component.saveProfile();
      expect(component.profileError()).toBe('Senha atual incorreta.');
    });

    it('define profileError de conflito para 409', async () => {
      profileService.updateProfile.mockRejectedValue(new HttpErrorResponse({ status: 409 }));
      await component.saveProfile();
      expect(component.profileError()).toBe('Usuário ou email já está em uso.');
    });

    it('define profileError genérico para outros erros', async () => {
      profileService.updateProfile.mockRejectedValue(new Error('network'));
      await component.saveProfile();
      expect(component.profileError()).toBe('Erro ao atualizar. Tente novamente.');
    });

    it('não chama updateProfile se o form for inválido', async () => {
      component.profileForm.get('username')?.setValue('');
      await component.saveProfile();
      expect(profileService.updateProfile).not.toHaveBeenCalled();
    });
  });

  // ── changePassword ────────────────────────────────────────────────────────

  describe('changePassword', () => {
    beforeEach(() => {
      component.passwordForm.setValue({
        currentPassword: 'old123',
        newPassword: 'New456!x',
        confirmPassword: 'New456!x',
      });
    });

    it('chama changePassword e exibe snackbar de sucesso', async () => {
      await component.changePassword();
      expect(profileService.changePassword).toHaveBeenCalledWith({
        currentPassword: 'old123',
        newPassword: 'New456!x',
      });
      expect(snackBar.open).toHaveBeenCalledWith('Senha alterada com sucesso!', 'OK', {
        duration: 3000,
      });
      expect(component.savingPwd()).toBe(false);
    });

    it('reseta o form após sucesso', async () => {
      await component.changePassword();
      expect(component.passwordForm.value.currentPassword).toBe('');
    });

    it('define passwordError "Senha atual incorreta." para 401', async () => {
      profileService.changePassword.mockRejectedValue(new HttpErrorResponse({ status: 401 }));
      await component.changePassword();
      expect(component.passwordError()).toBe('Senha atual incorreta.');
      expect(component.savingPwd()).toBe(false);
    });

    it('define passwordError "Senha atual incorreta." para 403', async () => {
      profileService.changePassword.mockRejectedValue(new HttpErrorResponse({ status: 403 }));
      await component.changePassword();
      expect(component.passwordError()).toBe('Senha atual incorreta.');
    });

    it('define passwordError genérico para outros erros', async () => {
      profileService.changePassword.mockRejectedValue(new Error('network'));
      await component.changePassword();
      expect(component.passwordError()).toBe('Erro ao alterar senha. Tente novamente.');
    });

    it('não chama changePassword se o form for inválido', async () => {
      component.passwordForm.get('currentPassword')?.setValue('');
      await component.changePassword();
      expect(profileService.changePassword).not.toHaveBeenCalled();
    });
  });

  // ── removeAvatar ──────────────────────────────────────────────────────────

  describe('removeAvatar', () => {
    it('chama profileService.deleteAvatar + avatarService.clearLocalAvatar e exibe snackbar', async () => {
      const avatarService = TestBed.inject(AvatarService);
      jest.spyOn(avatarService, 'clearLocalAvatar').mockImplementation(() => {});
      await component.removeAvatar();
      expect(profileService.deleteAvatar).toHaveBeenCalled();
      expect(avatarService.clearLocalAvatar).toHaveBeenCalled();
      expect(snackBar.open).toHaveBeenCalledWith('Foto removida.', 'OK', { duration: 2500 });
    });
  });
});
