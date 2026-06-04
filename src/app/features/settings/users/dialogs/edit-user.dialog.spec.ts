import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { EditUserDialogComponent } from './edit-user.dialog';
import { UserResponse } from '../../../../core/admin/users-admin.service';

const MOCK_USER: UserResponse = {
  id: 1,
  username: 'alice',
  email: 'alice@example.com',
  enabled: true,
  roles: [],
  createdAt: '2026-01-01T00:00:00Z',
};

describe('EditUserDialogComponent', () => {
  let component: EditUserDialogComponent;
  let dialogRef: jest.Mocked<MatDialogRef<EditUserDialogComponent>>;

  beforeEach(async () => {
    dialogRef = { close: jest.fn() } as unknown as jest.Mocked<MatDialogRef<EditUserDialogComponent>>;
    await TestBed.configureTestingModule({
      imports: [EditUserDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { user: MOCK_USER } },
      ],
    })
      .overrideTemplate(EditUserDialogComponent, '')
      .compileComponents();
    const fixture = TestBed.createComponent(EditUserDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('cria o componente', () => {
    expect(component).toBeTruthy();
  });

  it('formulário pré-preenchido com dados do usuário', () => {
    expect(component.form.value.username).toBe('alice');
    expect(component.form.value.email).toBe('alice@example.com');
  });

  it('submit() fecha o dialog com os dados atualizados', () => {
    component.form.patchValue({ username: 'alice2', email: 'alice2@example.com' });
    component.submit();
    expect(dialogRef.close).toHaveBeenCalledWith({ username: 'alice2', email: 'alice2@example.com' });
  });

  it('submit() não fecha o dialog quando username está vazio', () => {
    component.form.patchValue({ username: '' });
    component.submit();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });
});
