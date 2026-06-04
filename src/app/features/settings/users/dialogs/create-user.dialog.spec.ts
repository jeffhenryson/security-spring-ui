import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CreateUserDialogComponent } from './create-user.dialog';

const DIALOG_DATA = { availableRoles: ['ROLE_ADMIN', 'ROLE_USER'] };

describe('CreateUserDialogComponent', () => {
  let component: CreateUserDialogComponent;
  let dialogRef: jest.Mocked<MatDialogRef<CreateUserDialogComponent>>;

  beforeEach(async () => {
    dialogRef = { close: jest.fn() } as unknown as jest.Mocked<MatDialogRef<CreateUserDialogComponent>>;
    await TestBed.configureTestingModule({
      imports: [CreateUserDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: DIALOG_DATA },
      ],
    })
      .overrideTemplate(CreateUserDialogComponent, '')
      .compileComponents();
    const fixture = TestBed.createComponent(CreateUserDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('cria o componente', () => {
    expect(component).toBeTruthy();
  });

  it('formulário inválido quando campos obrigatórios estão vazios', () => {
    expect(component.form.invalid).toBe(true);
  });

  it('formulário válido com dados corretos', () => {
    component.form.setValue({ username: 'alice', email: '', password: 'Pass@1234', roles: [] });
    expect(component.form.valid).toBe(true);
  });

  it('submit() fecha o dialog com os dados do formulário quando válido', () => {
    component.form.setValue({ username: 'alice', email: 'a@b.com', password: 'Pass@1234', roles: ['ROLE_USER'] });
    component.submit();
    expect(dialogRef.close).toHaveBeenCalledWith({
      username: 'alice', email: 'a@b.com', password: 'Pass@1234', roles: ['ROLE_USER'],
    });
  });

  it('submit() não fecha o dialog quando o formulário é inválido', () => {
    component.submit();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('email inválido torna o formulário inválido', () => {
    component.form.setValue({ username: 'alice', email: 'nao-e-email', password: 'Pass@1234', roles: [] });
    expect(component.form.get('email')?.invalid).toBe(true);
  });
});
