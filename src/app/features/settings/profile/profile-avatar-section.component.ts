import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, computed, effect, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AvatarService } from '../../../core/auth/avatar.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ProfileService } from '../../../core/profile/profile.service';

@Component({
  selector: 'app-profile-avatar-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <section class="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl p-6">
      <h3 class="text-base font-semibold text-[var(--text-primary)] mt-0 mb-4">Foto de perfil</h3>
      <div class="flex items-center gap-5 flex-wrap">
        <div class="relative cursor-pointer group" (click)="triggerFileInput()">
          <div
            class="w-20 h-20 rounded-full bg-cyan-700 flex items-center justify-center
                      text-xl font-bold text-white overflow-hidden
                      ring-2 ring-[var(--border-color)]"
          >
            @if (avatar() && !avatarError()) {
              <img [src]="avatar()" alt="Foto de perfil" class="w-full h-full object-cover"
                   (error)="avatarError.set(true)" />
            } @else {
              {{ userInitials() }}
            }
          </div>
          <div
            class="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center
                      opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <mat-icon class="text-white">photo_camera</mat-icon>
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <button mat-stroked-button type="button" (click)="triggerFileInput()">
            <mat-icon>upload</mat-icon>
            {{ avatar() ? 'Alterar foto' : 'Carregar foto' }}
          </button>
          @if (avatar()) {
            <button
              mat-stroked-button
              type="button"
              class="!text-red-400 !border-red-900"
              (click)="removeAvatar()"
            >
              Remover foto
            </button>
          }
        </div>
      </div>
      <input
        #fileInput
        type="file"
        accept="image/*"
        class="hidden"
        (change)="onFileSelected($event)"
      />
    </section>
  `,
})
export class ProfileAvatarSectionComponent {
  @ViewChild('fileInput') private readonly fileInput!: ElementRef<HTMLInputElement>;

  private readonly avatarService = inject(AvatarService);
  private readonly profileService = inject(ProfileService);
  private readonly authService = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);

  readonly userInitials = input.required<string>();

  readonly avatar = this.avatarService.currentAvatar;
  readonly avatarError = signal(false);

  constructor() {
    // Reset error flag when the avatar URL changes (new upload or user change)
    effect(() => { this.avatar(); this.avatarError.set(false); });
  }

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      this.snackBar.open('Imagem muito grande. O tamanho máximo é 2 MB.', 'Fechar', { duration: 4000 });
      (event.target as HTMLInputElement).value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = async () => {
        const size = 200;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const ctx = canvas.getContext('2d')!;
        const scale = Math.max(size / img.width, size / img.height);
        const sw = size / scale;
        const sh = size / scale;
        ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, size, size);
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          // Cache local imediato para UX responsiva enquanto o upload processa.
          this.avatarService.setLocalAvatar(canvas.toDataURL('image/jpeg', 0.85));
          try {
            await this.profileService.uploadAvatar(blob);
            await this.authService.loadCurrentUser();
            this.snackBar.open('Foto atualizada!', 'OK', { duration: 2500 });
          } catch {
            this.avatarService.clearLocalAvatar();
            this.snackBar.open('Erro ao enviar foto. Tente novamente.', 'Fechar', { duration: 4000 });
          }
        }, 'image/jpeg', 0.85);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    (event.target as HTMLInputElement).value = '';
  }

  async removeAvatar(): Promise<void> {
    try {
      await this.profileService.deleteAvatar();
      this.avatarService.clearLocalAvatar();
      await this.authService.loadCurrentUser();
      this.snackBar.open('Foto removida.', 'OK', { duration: 2500 });
    } catch {
      this.snackBar.open('Erro ao remover foto. Tente novamente.', 'Fechar', { duration: 4000 });
    }
  }
}
