import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { RolesComponent } from './roles.component';
import { RolesAdminService, RoleResponse as Role } from '../../../core/admin/roles-admin.service';
import { PermissionsAdminService } from '../../../core/admin/permissions-admin.service';
import { PagedResponse } from '../../../core/admin/paged-state';

const MOCK_ROLE: Role = { name: 'ADMIN', permissions: ['USER_READ'] };

const EMPTY_PAGE: PagedResponse<Role> = { content: [], totalElements: 0 };
const ONE_PAGE: PagedResponse<Role> = { content: [MOCK_ROLE], totalElements: 1 };

function makeDialogRef(result: unknown) {
  return { afterClosed: () => of(result) } as unknown as MatDialogRef<unknown>;
}

describe('RolesComponent', () => {
  let component: RolesComponent;
  let rolesService: jest.Mocked<RolesAdminService>;
  let permissionsService: jest.Mocked<Pick<PermissionsAdminService, 'listAll'>>;
  let snackBar: jest.Mocked<Pick<MatSnackBar, 'open'>>;
  let dialog: jest.Mocked<Pick<MatDialog, 'open'>>;

  beforeEach(async () => {
    rolesService = {
      list: jest.fn().mockResolvedValue(ONE_PAGE),
      create: jest.fn().mockResolvedValue(MOCK_ROLE),
      remove: jest.fn().mockResolvedValue(undefined),
      addPermission: jest.fn().mockResolvedValue(undefined),
      removePermission: jest.fn().mockResolvedValue(undefined),
      listAll: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<RolesAdminService>;

    permissionsService = { listAll: jest.fn().mockResolvedValue([]) };
    snackBar = { open: jest.fn() };
    dialog = { open: jest.fn().mockReturnValue(makeDialogRef(null)) };

    await TestBed.configureTestingModule({
      imports: [RolesComponent],
      providers: [
        { provide: RolesAdminService, useValue: rolesService },
        { provide: PermissionsAdminService, useValue: permissionsService },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: MatDialog, useValue: dialog },
      ],
    })
      .overrideTemplate(RolesComponent, '')
      .compileComponents();

    const fixture = TestBed.createComponent(RolesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await Promise.resolve();
  });

  // ── init ──────────────────────────────────────────────────────────────────

  it('carrega roles no ngOnInit', () => {
    expect(rolesService.list).toHaveBeenCalledWith(0, 10, '');
    expect(component.paged.rows()).toEqual([MOCK_ROLE]);
    expect(component.paged.total()).toBe(1);
    expect(component.paged.loading()).toBe(false);
  });

  it('exibe snackbar de erro se carregamento falhar', async () => {
    rolesService.list.mockRejectedValueOnce(new Error('network'));
    await (component as any).load();
    expect(snackBar.open).toHaveBeenCalledWith('Erro ao carregar roles.', 'OK', {
      duration: 3000,
    });
  });

  // ── paginação ─────────────────────────────────────────────────────────────

  it('onPage atualiza page/size e recarrega', async () => {
    jest.clearAllMocks();
    rolesService.list.mockResolvedValue(ONE_PAGE);
    component.onPage({ pageIndex: 1, pageSize: 25, length: 50 });
    await Promise.resolve();
    expect(component.paged.page()).toBe(1);
    expect(component.paged.size()).toBe(25);
    expect(rolesService.list).toHaveBeenCalledWith(1, 25, '');
  });

  // ── openCreate ────────────────────────────────────────────────────────────

  it('openCreate: não cria role se dialog cancelado', async () => {
    dialog.open.mockReturnValue(makeDialogRef(null));
    await component.openCreate();
    expect(rolesService.create).not.toHaveBeenCalled();
  });

  it('openCreate: chama rolesService.create e recarrega em sucesso', async () => {
    dialog.open.mockReturnValue(makeDialogRef('MODERATOR'));
    jest.clearAllMocks();
    rolesService.list.mockResolvedValue(ONE_PAGE);
    rolesService.create.mockResolvedValue({ name: 'MODERATOR', permissions: [] });

    await component.openCreate();
    expect(rolesService.create).toHaveBeenCalledWith('MODERATOR');
    expect(rolesService.list).toHaveBeenCalled();
  });

  // ── delete ────────────────────────────────────────────────────────────────

  it('delete: não exclui se dialog cancelado', async () => {
    dialog.open.mockReturnValue(makeDialogRef(false));
    await component.delete(MOCK_ROLE);
    expect(rolesService.remove).not.toHaveBeenCalled();
  });

  it('delete: chama rolesService.remove e recarrega após confirmação', async () => {
    dialog.open.mockReturnValue(makeDialogRef(true));
    jest.clearAllMocks();
    rolesService.list.mockResolvedValue(EMPTY_PAGE);
    rolesService.remove.mockResolvedValue(undefined);

    await component.delete(MOCK_ROLE);
    expect(rolesService.remove).toHaveBeenCalledWith(MOCK_ROLE.name);
    expect(rolesService.list).toHaveBeenCalled();
  });
});
