import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ManageRolesDialogComponent } from './manage-roles.dialog';
import { AuthStore } from '../../../../core/auth/auth.store';
import { UsersAdminService } from '../../../../core/admin/users-admin.service';
import { PERMISSIONS } from '../../../../core/rbac/permissions.constants';

const DIALOG_DATA = {
  username: 'alice',
  currentRoles: ['ROLE_USER'],
  allRoles: ['ROLE_USER', 'ROLE_ADMIN'],
};

function makeStore(permissions: string[] = [PERMISSIONS.USER_ROLE_ASSIGN]): Partial<AuthStore> {
  return {
    hasPermission: jest.fn((p: string) => permissions.includes(p)),
    permissions: jest.fn(() => permissions),
  } as unknown as Partial<AuthStore>;
}

describe('ManageRolesDialogComponent', () => {
  let component: ManageRolesDialogComponent;
  let usersService: jest.Mocked<UsersAdminService>;
  let snackBar: { open: jest.Mock };
  let dialogRef: jest.Mocked<MatDialogRef<ManageRolesDialogComponent>>;

  function setup(permissions = [PERMISSIONS.USER_ROLE_ASSIGN]) {
    usersService = {
      assignRole: jest.fn().mockResolvedValue(undefined),
      removeRole: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<UsersAdminService>;
    snackBar = { open: jest.fn() };
    dialogRef = { close: jest.fn() } as unknown as jest.Mocked<MatDialogRef<ManageRolesDialogComponent>>;

    TestBed.configureTestingModule({
      imports: [ManageRolesDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: DIALOG_DATA },
        { provide: AuthStore, useValue: makeStore(permissions) },
        { provide: UsersAdminService, useValue: usersService },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    }).overrideTemplate(ManageRolesDialogComponent, '');
    const fixture = TestBed.createComponent(ManageRolesDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => setup());

  it('cria o componente', () => {
    expect(component).toBeTruthy();
  });

  it('currentRoles inicializa com as roles do usuário', () => {
    expect(component.currentRoles()).toEqual(['ROLE_USER']);
  });

  it('availableRoles filtra roles já atribuídas', () => {
    expect(component.availableRoles()).toEqual(['ROLE_ADMIN']);
  });

  it('canAssign é true quando tem permissão USER_ROLE_ASSIGN', () => {
    expect(component.canAssign()).toBe(true);
  });

  it('addRole() adiciona a role e exibe snackbar', async () => {
    component.selectedRole.set('ROLE_ADMIN');
    await component.addRole();
    expect(usersService.assignRole).toHaveBeenCalledWith('alice', 'ROLE_ADMIN');
    expect(component.currentRoles()).toContain('ROLE_ADMIN');
    expect(component.changed()).toBe(true);
    expect(snackBar.open).toHaveBeenCalled();
  });

  it('confirmRemoveRole() remove a role e exibe snackbar', async () => {
    await component.confirmRemoveRole('ROLE_USER');
    expect(usersService.removeRole).toHaveBeenCalledWith('alice', 'ROLE_USER');
    expect(component.currentRoles()).not.toContain('ROLE_USER');
    expect(component.changed()).toBe(true);
  });

  it('addRole() exibe erro quando o serviço falha', async () => {
    usersService.assignRole.mockRejectedValueOnce(new Error('fail'));
    component.selectedRole.set('ROLE_ADMIN');
    await component.addRole();
    expect(snackBar.open).toHaveBeenCalledWith('Erro ao atribuir role.', 'OK', expect.any(Object));
  });
});
