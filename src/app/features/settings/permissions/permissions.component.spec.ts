import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { PermissionsComponent } from './permissions.component';
import { PermissionsAdminService, PermissionResponse as Permission } from '../../../core/admin/permissions-admin.service';
import { PagedResponse } from '../../../core/admin/paged-state';
import { HttpErrorResponse } from '@angular/common/http';

const MOCK_PERM: Permission = { name: 'USER_READ' };

const EMPTY_PAGE: PagedResponse<Permission> = { content: [], totalElements: 0 };
const ONE_PAGE: PagedResponse<Permission> = { content: [MOCK_PERM], totalElements: 1 };

function makeDialogRef(result: unknown) {
  return { afterClosed: () => of(result) } as unknown as MatDialogRef<unknown>;
}

describe('PermissionsComponent', () => {
  let component: PermissionsComponent;
  let permissionsService: jest.Mocked<PermissionsAdminService>;
  let snackBar: jest.Mocked<Pick<MatSnackBar, 'open'>>;
  let dialog: jest.Mocked<Pick<MatDialog, 'open'>>;

  beforeEach(async () => {
    permissionsService = {
      list: jest.fn().mockResolvedValue(ONE_PAGE),
      create: jest.fn().mockResolvedValue(MOCK_PERM),
      remove: jest.fn().mockResolvedValue(undefined),
      listAll: jest.fn().mockResolvedValue([MOCK_PERM]),
    } as unknown as jest.Mocked<PermissionsAdminService>;

    snackBar = { open: jest.fn() };
    dialog = { open: jest.fn().mockReturnValue(makeDialogRef(null)) };

    await TestBed.configureTestingModule({
      imports: [PermissionsComponent],
      providers: [
        { provide: PermissionsAdminService, useValue: permissionsService },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: MatDialog, useValue: dialog },
      ],
    })
      .overrideTemplate(PermissionsComponent, '')
      .compileComponents();

    const fixture = TestBed.createComponent(PermissionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await Promise.resolve();
  });

  // ── init ──────────────────────────────────────────────────────────────────

  it('carrega permissões no ngOnInit', () => {
    expect(permissionsService.list).toHaveBeenCalledWith(0, 10, undefined);
    expect(component.paged.rows()).toEqual([MOCK_PERM]);
    expect(component.paged.loading()).toBe(false);
  });

  it('exibe snackbar de erro se carregamento falhar', async () => {
    permissionsService.list.mockRejectedValueOnce(new Error('network'));
    await (component as any).load();
    expect(snackBar.open).toHaveBeenCalledWith('Erro ao carregar permissões.', 'OK', {
      duration: 3000,
    });
  });

  // ── paginação ─────────────────────────────────────────────────────────────

  it('onPage atualiza page/size e recarrega', async () => {
    jest.clearAllMocks();
    permissionsService.list.mockResolvedValue(ONE_PAGE);
    component.onPage({ pageIndex: 1, pageSize: 25, length: 50 });
    await Promise.resolve();
    expect(component.paged.page()).toBe(1);
    expect(component.paged.size()).toBe(25);
    expect(permissionsService.list).toHaveBeenCalledWith(1, 25, undefined);
  });

  // ── create ────────────────────────────────────────────────────────────────

  it('create: não envia se form inválido (campo vazio)', async () => {
    component.createForm.setValue({ name: '' });
    await component.create();
    expect(permissionsService.create).not.toHaveBeenCalled();
  });

  it('create: chama permissionsService.create e recarrega em sucesso', async () => {
    component.createForm.setValue({ name: 'REPORT_READ' });
    jest.clearAllMocks();
    permissionsService.create.mockResolvedValue({ name: 'REPORT_READ' });
    permissionsService.list.mockResolvedValue(ONE_PAGE);

    await component.create();
    expect(permissionsService.create).toHaveBeenCalledWith('REPORT_READ');
    expect(permissionsService.list).toHaveBeenCalled();
    expect(component.submitting()).toBe(false);
  });

  it('create: exibe snackbar "já existe" em erro 409', async () => {
    component.createForm.setValue({ name: 'USER_READ' });
    const err = new HttpErrorResponse({ status: 409 });
    permissionsService.create.mockRejectedValueOnce(err);

    await component.create();
    expect(snackBar.open).toHaveBeenCalledWith(
      expect.stringContaining('já existe'),
      'OK',
      expect.any(Object),
    );
  });

  // ── delete ────────────────────────────────────────────────────────────────

  it('delete: não exclui se dialog cancelado', async () => {
    dialog.open.mockReturnValue(makeDialogRef(false));
    await component.delete(MOCK_PERM);
    expect(permissionsService.remove).not.toHaveBeenCalled();
  });

  it('delete: chama permissionsService.remove e recarrega após confirmação', async () => {
    dialog.open.mockReturnValue(makeDialogRef(true));
    jest.clearAllMocks();
    permissionsService.list.mockResolvedValue(EMPTY_PAGE);
    permissionsService.remove.mockResolvedValue(undefined);

    await component.delete(MOCK_PERM);
    expect(permissionsService.remove).toHaveBeenCalledWith(MOCK_PERM.name);
    expect(permissionsService.list).toHaveBeenCalled();
  });
});
