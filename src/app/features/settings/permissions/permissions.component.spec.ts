import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { PermissionsComponent } from './permissions.component';
import { PermissionsAdminService, PermissionResponse as Permission } from '../../../core/admin/permissions-admin.service';
import { HttpErrorResponse } from '@angular/common/http';

const MOCK_PERM: Permission = { name: 'USER_READ' };

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
      listAll: jest.fn().mockResolvedValue([MOCK_PERM]),
      create: jest.fn().mockResolvedValue(MOCK_PERM),
      remove: jest.fn().mockResolvedValue(undefined),
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

  it('carrega permissões no ngOnInit via listAll', () => {
    expect(permissionsService.listAll).toHaveBeenCalled();
    expect(component.allPermissions()).toEqual([MOCK_PERM]);
    expect(component.loading()).toBe(false);
  });

  it('exibe snackbar de erro se carregamento falhar', async () => {
    permissionsService.listAll.mockRejectedValueOnce(new Error('network'));
    await (component as any).load();
    expect(snackBar.open).toHaveBeenCalledWith('Erro ao carregar permissões.', 'OK', {
      duration: 3000,
    });
  });

  // ── busca local ───────────────────────────────────────────────────────────

  it('filtered retorna todas as permissões sem filtro', () => {
    expect(component.filtered()).toEqual([MOCK_PERM]);
  });

  it('filtered filtra por nome (case-insensitive)', () => {
    component.searchControl.setValue('user');
    expect(component.filtered()).toEqual([MOCK_PERM]);

    component.searchControl.setValue('NONEXISTENT');
    expect(component.filtered()).toEqual([]);
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
    permissionsService.listAll.mockResolvedValue([MOCK_PERM, { name: 'REPORT_READ' }]);

    await component.create();
    expect(permissionsService.create).toHaveBeenCalledWith('REPORT_READ');
    expect(permissionsService.listAll).toHaveBeenCalled();
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
    permissionsService.listAll.mockResolvedValue([]);
    permissionsService.remove.mockResolvedValue(undefined);

    await component.delete(MOCK_PERM);
    expect(permissionsService.remove).toHaveBeenCalledWith(MOCK_PERM.name);
    expect(permissionsService.listAll).toHaveBeenCalled();
  });
});
