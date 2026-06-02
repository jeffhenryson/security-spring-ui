import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { UsersComponent } from './users.component';
import { UsersAdminService, UserResponse as User } from '../../../core/admin/users-admin.service';
import { RolesAdminService } from '../../../core/admin/roles-admin.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { PagedResponse } from '../../../core/admin/paged-state';

const MOCK_USER: User = {
  id: 1,
  username: 'alice',
  email: 'alice@example.com',
  enabled: true,
  emailVerified: true,
  roles: ['ADMIN'],
};

const EMPTY_PAGE: PagedResponse<User> = { content: [], totalElements: 0 };
const ONE_PAGE: PagedResponse<User> = { content: [MOCK_USER], totalElements: 1 };

function makeDialogRef(result: unknown) {
  return { afterClosed: () => of(result) } as unknown as MatDialogRef<unknown>;
}

describe('UsersComponent', () => {
  let component: UsersComponent;
  let usersService: jest.Mocked<UsersAdminService>;
  let rolesService: jest.Mocked<RolesAdminService>;
  let snackBar: jest.Mocked<Pick<MatSnackBar, 'open'>>;
  let dialog: jest.Mocked<Pick<MatDialog, 'open'>>;

  beforeEach(async () => {
    usersService = {
      list: jest.fn().mockResolvedValue(ONE_PAGE),
      create: jest.fn().mockResolvedValue(MOCK_USER),
      update: jest.fn().mockResolvedValue(MOCK_USER),
      remove: jest.fn().mockResolvedValue(undefined),
      enable: jest.fn().mockResolvedValue(undefined),
      disable: jest.fn().mockResolvedValue(undefined),
      assignRole: jest.fn().mockResolvedValue(undefined),
      removeRole: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<UsersAdminService>;

    rolesService = {
      list: jest.fn().mockResolvedValue(EMPTY_PAGE),
      listAll: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<RolesAdminService>;

    snackBar = { open: jest.fn() };
    dialog = { open: jest.fn().mockReturnValue(makeDialogRef(null)) };

    await TestBed.configureTestingModule({
      imports: [UsersComponent],
      providers: [
        { provide: UsersAdminService, useValue: usersService },
        { provide: RolesAdminService, useValue: rolesService },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: MatDialog, useValue: dialog },
      ],
    })
      .overrideTemplate(UsersComponent, '')
      .compileComponents();

    const fixture = TestBed.createComponent(UsersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await Promise.resolve();
  });

  // ── init ──────────────────────────────────────────────────────────────────

  it('carrega usuários no ngOnInit', () => {
    expect(usersService.list).toHaveBeenCalledWith(0, 10, { sortBy: 'id', sortDir: 'asc' });
    expect(component.paged.rows()).toEqual([MOCK_USER]);
    expect(component.paged.total()).toBe(1);
    expect(component.paged.loading()).toBe(false);
  });

  it('exibe snackbar de erro se o carregamento falhar', async () => {
    usersService.list.mockRejectedValueOnce(new Error('network'));
    await (component as any).load();
    expect(snackBar.open).toHaveBeenCalledWith('Erro ao carregar usuários.', 'OK', {
      duration: 3000,
    });
  });

  // ── displayedCols com permissões ─────────────────────────────────────────

  it('exibe colunas base quando usuário não tem permissões de ação', () => {
    const store = TestBed.inject(AuthStore);
    store.setCurrentUser({
      id: 1,
      username: 'u',
      email: 'u@e.com',
      enabled: true,
      emailVerified: true,
      pendingEmail: null,
      roles: [],
      permissions: [],
    });
    expect(component.displayedCols()).toEqual(['username', 'email', 'status', 'roles']);
  });

  it('adiciona coluna "actions" quando usuário tem permissão USER_UPDATE', () => {
    const store = TestBed.inject(AuthStore);
    store.setCurrentUser({
      id: 1,
      username: 'admin',
      email: 'a@e.com',
      enabled: true,
      emailVerified: true,
      pendingEmail: null,
      roles: [],
      permissions: ['USER_UPDATE'],
    });
    expect(component.displayedCols()).toContain('actions');
  });

  // ── paginação ─────────────────────────────────────────────────────────────

  it('onPage atualiza page/size e recarrega', async () => {
    jest.clearAllMocks();
    component.onPage({ pageIndex: 2, pageSize: 20, length: 100 });
    await Promise.resolve();
    expect(component.paged.page()).toBe(2);
    expect(component.paged.size()).toBe(20);
    expect(usersService.list).toHaveBeenCalledWith(2, 20, { sortBy: 'id', sortDir: 'asc' });
  });

  // ── openCreate ────────────────────────────────────────────────────────────

  it('openCreate: não cria usuário se dialog for cancelado', async () => {
    dialog.open.mockReturnValue(makeDialogRef(null));
    await component.openCreate();
    expect(usersService.create).not.toHaveBeenCalled();
  });

  it('openCreate: chama usersService.create e recarrega em caso de sucesso', async () => {
    const formData = { username: 'bob', email: 'bob@e.com', password: 'pass', roles: [] };
    dialog.open.mockReturnValue(makeDialogRef(formData));
    jest.clearAllMocks();
    usersService.list.mockResolvedValue(ONE_PAGE);

    await component.openCreate();
    expect(usersService.create).toHaveBeenCalledWith(formData);
    expect(usersService.list).toHaveBeenCalled();
  });

  // ── openEdit ──────────────────────────────────────────────────────────────

  it('openEdit: não atualiza se dialog for cancelado', async () => {
    dialog.open.mockReturnValue(makeDialogRef(null));
    await component.openEdit(MOCK_USER);
    expect(usersService.update).not.toHaveBeenCalled();
  });

  it('openEdit: chama usersService.update e recarrega', async () => {
    const editData = { username: 'alice2', email: 'a2@e.com' };
    dialog.open.mockReturnValue(makeDialogRef(editData));
    jest.clearAllMocks();
    usersService.list.mockResolvedValue(ONE_PAGE);

    await component.openEdit(MOCK_USER);
    expect(usersService.update).toHaveBeenCalledWith(MOCK_USER.id, editData);
    expect(usersService.list).toHaveBeenCalled();
  });

  // ── toggleStatus ──────────────────────────────────────────────────────────

  it('toggleStatus: não altera status se o confirm dialog for cancelado', async () => {
    dialog.open.mockReturnValue(makeDialogRef(false));
    await component.toggleStatus(MOCK_USER);
    expect(usersService.disable).not.toHaveBeenCalled();
  });

  it('toggleStatus: chama disable para usuário ativo após confirmação', async () => {
    dialog.open.mockReturnValue(makeDialogRef(true));
    jest.clearAllMocks();
    usersService.list.mockResolvedValue(ONE_PAGE);

    await component.toggleStatus(MOCK_USER); // MOCK_USER.enabled = true
    expect(usersService.disable).toHaveBeenCalledWith(MOCK_USER.id);
    expect(usersService.list).toHaveBeenCalled();
  });

  it('toggleStatus: chama enable para usuário inativo após confirmação', async () => {
    dialog.open.mockReturnValue(makeDialogRef(true));
    const inactiveUser = { ...MOCK_USER, enabled: false };
    jest.clearAllMocks();
    usersService.list.mockResolvedValue(ONE_PAGE);

    await component.toggleStatus(inactiveUser);
    expect(usersService.enable).toHaveBeenCalledWith(inactiveUser.id);
  });

  // ── delete ────────────────────────────────────────────────────────────────

  it('delete: não exclui se o confirm dialog for cancelado', async () => {
    dialog.open.mockReturnValue(makeDialogRef(false));
    await component.delete(MOCK_USER);
    expect(usersService.remove).not.toHaveBeenCalled();
  });

  it('delete: chama usersService.remove e recarrega após confirmação', async () => {
    dialog.open.mockReturnValue(makeDialogRef(true));
    jest.clearAllMocks();
    usersService.list.mockResolvedValue(EMPTY_PAGE);

    await component.delete(MOCK_USER);
    expect(usersService.remove).toHaveBeenCalledWith(MOCK_USER.id);
    expect(usersService.list).toHaveBeenCalled();
  });
});
