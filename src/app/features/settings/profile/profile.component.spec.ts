import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProfileComponent } from './profile.component';
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

const UPDATED_USER = { ...MOCK_USER, username: 'alice2' };

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let store: AuthStore;
  let profileService: jest.Mocked<ProfileService>;
  let snackBar: jest.Mocked<Pick<MatSnackBar, 'open'>>;

  beforeEach(async () => {
    profileService = {
      updateProfile: jest.fn().mockResolvedValue(UPDATED_USER),
      changePassword: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ProfileService>;

    snackBar = { open: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        { provide: ProfileService, useValue: profileService },
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
    it('chama updateProfile e atualiza o store com o response', async () => {
      await component.saveProfile();
      expect(profileService.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'alice', email: 'alice@example.com' }),
      );
      expect(store.currentUser()?.username).toBe('alice2');
    });

    it('exibe snackbar de sucesso e limpa saving', async () => {
      await component.saveProfile();
      expect(snackBar.open).toHaveBeenCalledWith('Perfil atualizado!', 'OK', { duration: 3000 });
      expect(component.saving()).toBe(false);
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

});
