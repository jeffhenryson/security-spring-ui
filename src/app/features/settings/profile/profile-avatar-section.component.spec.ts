import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProfileAvatarSectionComponent } from './profile-avatar-section.component';
import { AvatarService } from '../../../core/auth/avatar.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ProfileService } from '../../../core/profile/profile.service';

describe('ProfileAvatarSectionComponent', () => {
  let component: ProfileAvatarSectionComponent;
  let avatarService: jest.Mocked<Pick<AvatarService, 'clearLocalAvatar' | 'setLocalAvatar'>> & { currentAvatar: ReturnType<typeof signal<string | null>> };
  let profileService: jest.Mocked<Pick<ProfileService, 'deleteAvatar' | 'uploadAvatar'>>;
  let authService: jest.Mocked<Pick<AuthService, 'loadCurrentUser'>>;
  let snackBar: jest.Mocked<Pick<MatSnackBar, 'open'>>;

  beforeEach(async () => {
    profileService = {
      deleteAvatar: jest.fn().mockResolvedValue(undefined),
      uploadAvatar: jest.fn().mockResolvedValue(undefined),
    };
    authService = { loadCurrentUser: jest.fn().mockResolvedValue(undefined) };
    avatarService = {
      currentAvatar: signal<string | null>(null),
      clearLocalAvatar: jest.fn(),
      setLocalAvatar: jest.fn(),
    };
    snackBar = { open: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [ProfileAvatarSectionComponent],
      providers: [
        { provide: ProfileService, useValue: profileService },
        { provide: AuthService, useValue: authService },
        { provide: AvatarService, useValue: avatarService },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    })
      .overrideTemplate(ProfileAvatarSectionComponent, '')
      .compileComponents();

    const fixture = TestBed.createComponent(ProfileAvatarSectionComponent);
    fixture.componentRef.setInput('userInitials', 'AL');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ── inputs ────────────────────────────────────────────────────────────────

  it('cria o componente', () => {
    expect(component).toBeTruthy();
  });

  it('expõe userInitials via input', () => {
    expect(component.userInitials()).toBe('AL');
  });

  // ── removeAvatar ──────────────────────────────────────────────────────────

  describe('removeAvatar', () => {
    it('chama deleteAvatar + clearLocalAvatar + loadCurrentUser e exibe snackbar', async () => {
      await component.removeAvatar();
      expect(profileService.deleteAvatar).toHaveBeenCalled();
      expect(avatarService.clearLocalAvatar).toHaveBeenCalled();
      expect(authService.loadCurrentUser).toHaveBeenCalled();
      expect(snackBar.open).toHaveBeenCalledWith('Foto removida.', 'OK', { duration: 2500 });
    });

    it('exibe snackbar de erro quando deleteAvatar falha', async () => {
      profileService.deleteAvatar.mockRejectedValue(new Error('network'));
      await component.removeAvatar();
      expect(snackBar.open).toHaveBeenCalledWith(
        'Erro ao remover foto. Tente novamente.',
        'Fechar',
        { duration: 4000 },
      );
    });
  });

  // ── onFileSelected — validação ────────────────────────────────────────────

  describe('onFileSelected', () => {
    it('exibe snackbar de erro para arquivo maior que 2 MB', () => {
      const bigFile = new File([new ArrayBuffer(3 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' });
      const event = { target: { files: [bigFile], value: '' } } as unknown as Event;
      component.onFileSelected(event);
      expect(snackBar.open).toHaveBeenCalledWith(
        'Imagem muito grande. O tamanho máximo é 2 MB.',
        'Fechar',
        { duration: 4000 },
      );
    });

    it('não chama uploadAvatar para arquivo muito grande', () => {
      const bigFile = new File([new ArrayBuffer(3 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' });
      const event = { target: { files: [bigFile], value: '' } } as unknown as Event;
      component.onFileSelected(event);
      expect(profileService.uploadAvatar).not.toHaveBeenCalled();
    });

    it('não faz nada quando nenhum arquivo é selecionado', () => {
      const event = { target: { files: [], value: '' } } as unknown as Event;
      component.onFileSelected(event);
      expect(profileService.uploadAvatar).not.toHaveBeenCalled();
      expect(snackBar.open).not.toHaveBeenCalled();
    });
  });
});
