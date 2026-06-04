import { TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { CreateRoleDialogComponent } from './create-role.dialog';

describe('CreateRoleDialogComponent', () => {
  let component: CreateRoleDialogComponent;
  let dialogRef: jest.Mocked<MatDialogRef<CreateRoleDialogComponent>>;

  beforeEach(async () => {
    dialogRef = { close: jest.fn() } as unknown as jest.Mocked<MatDialogRef<CreateRoleDialogComponent>>;
    await TestBed.configureTestingModule({
      imports: [CreateRoleDialogComponent],
      providers: [{ provide: MatDialogRef, useValue: dialogRef }],
    })
      .overrideTemplate(CreateRoleDialogComponent, '')
      .compileComponents();
    const fixture = TestBed.createComponent(CreateRoleDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('cria o componente', () => {
    expect(component).toBeTruthy();
  });

  it('formulário inválido quando name está vazio', () => {
    expect(component.form.invalid).toBe(true);
  });

  it('submit() fecha o dialog com o nome da role', () => {
    component.form.setValue({ name: 'MODERATOR' });
    component.submit();
    expect(dialogRef.close).toHaveBeenCalledWith('MODERATOR');
  });

  it('submit() não fecha o dialog quando formulário é inválido', () => {
    component.submit();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });
});
