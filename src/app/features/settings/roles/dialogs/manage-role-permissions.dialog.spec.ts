import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ManageRolePermissionsDialogComponent } from './manage-role-permissions.dialog';
import { AuthStore } from '../../../../core/auth/auth.store';
import { RolesAdminService } from '../../../../core/admin/roles-admin.service';
import { PERMISSIONS } from '../../../../core/rbac/permissions.constants';

const DIALOG_DATA = {
  role: { name: 'ROLE_USER', permissions: ['USER_READ'] },
  allPermissions: ['USER_READ', 'USER_CREATE', 'USER_DELETE', 'DEV_ROLE_MANAGE'],
};

function makeStore(permissions: string[]): Partial<AuthStore> {
  return { hasPermission: jest.fn((p: string) => permissions.includes(p)) } as unknown as Partial<AuthStore>;
}

describe('ManageRolePermissionsDialogComponent', () => {
  let component: ManageRolePermissionsDialogComponent;
  let rolesService: jest.Mocked<RolesAdminService>;
  let snackBar: { open: jest.Mock };

  function setup(permissions = [PERMISSIONS.ROLE_MANAGE_PERMISSIONS]) {
    rolesService = {
      addPermission: jest.fn().mockResolvedValue(undefined),
      removePermission: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<RolesAdminService>;
    snackBar = { open: jest.fn() };

    TestBed.configureTestingModule({
      imports: [ManageRolePermissionsDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: { close: jest.fn() } },
        { provide: MAT_DIALOG_DATA, useValue: DIALOG_DATA },
        { provide: AuthStore, useValue: makeStore(permissions) },
        { provide: RolesAdminService, useValue: rolesService },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    }).overrideTemplate(ManageRolePermissionsDialogComponent, '');
    const fixture = TestBed.createComponent(ManageRolePermissionsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => setup());

  it('cria o componente', () => {
    expect(component).toBeTruthy();
  });

  it('role() inicializa com as permissões da role', () => {
    expect(component.role().permissions).toEqual(['USER_READ']);
  });

  it('availablePerms() filtra permissões já atribuídas', () => {
    expect(component.availablePerms()).not.toContain('USER_READ');
    expect(component.availablePerms()).toContain('USER_CREATE');
  });

  it('availablePerms() filtra permissões DEV quando não tem DEV_ROLE_MANAGE', () => {
    expect(component.availablePerms()).not.toContain('DEV_ROLE_MANAGE');
  });

  it('canRemove() retorna true para permissão normal com ROLE_MANAGE_PERMISSIONS', () => {
    expect(component.canRemove('USER_READ')).toBe(true);
  });

  it('canRemove() retorna false para permissão DEV sem DEV_ROLE_MANAGE', () => {
    expect(component.canRemove('DEV_ROLE_MANAGE')).toBe(false);
  });

  it('addPerm() adiciona permissão e exibe snackbar', async () => {
    component.selectedPerm.set('USER_CREATE');
    await component.addPerm();
    expect(rolesService.addPermission).toHaveBeenCalledWith('ROLE_USER', 'USER_CREATE');
    expect(component.role().permissions).toContain('USER_CREATE');
    expect(snackBar.open).toHaveBeenCalled();
  });

  it('removePerm() remove permissão e exibe snackbar', async () => {
    await component.removePerm('USER_READ');
    expect(rolesService.removePermission).toHaveBeenCalledWith('ROLE_USER', 'USER_READ');
    expect(component.role().permissions).not.toContain('USER_READ');
  });

  it('addPerm() exibe erro quando o serviço falha', async () => {
    rolesService.addPermission.mockRejectedValueOnce(new Error('fail'));
    component.selectedPerm.set('USER_CREATE');
    await component.addPerm();
    expect(snackBar.open).toHaveBeenCalledWith('Erro ao adicionar permissão.', 'OK', expect.any(Object));
  });
});
