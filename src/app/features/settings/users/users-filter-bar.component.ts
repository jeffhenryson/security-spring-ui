import { ChangeDetectionStrategy, Component, DestroyRef, inject, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';

export interface UserFilter {
  search: string;
  status: string;
}

@Component({
  selector: 'app-users-filter-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule],
  template: `
    <div class="flex flex-wrap gap-3">
      <mat-form-field appearance="outline" class="cs-input flex-1 min-w-[200px] !pb-0">
        <mat-label>Buscar por nome ou email</mat-label>
        <mat-icon matPrefix class="!text-[var(--text-secondary)]">search</mat-icon>
        <input matInput [formControl]="searchControl" />
      </mat-form-field>
      <mat-form-field appearance="outline" class="cs-input w-40 !pb-0">
        <mat-label>Status</mat-label>
        <mat-select [formControl]="statusControl">
          <mat-option value="">Todos</mat-option>
          <mat-option value="active">Ativo</mat-option>
          <mat-option value="inactive">Inativo</mat-option>
        </mat-select>
      </mat-form-field>
    </div>
  `,
})
export class UsersFilterBarComponent {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly filterChange = output<UserFilter>();

  readonly searchControl = this.fb.control('');
  readonly statusControl = this.fb.control('');

  constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.emit());

    this.statusControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.emit());
  }

  private emit(): void {
    this.filterChange.emit({
      search: this.searchControl.value?.trim() ?? '',
      status: this.statusControl.value ?? '',
    });
  }
}
