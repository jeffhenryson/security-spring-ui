import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuditLogsComponent } from './audit-logs.component';
import { AuditLogsService, AuditLogResponse } from '../../../core/admin/audit-logs.service';
import { PagedResponse } from '../../../core/admin/paged-state';

const MOCK_ENTRY: AuditLogResponse = {
  id: 1,
  timestamp: '2026-01-01T12:00:00Z',
  action: 'USER_CREATE',
  who: 'admin',
  target: 'alice',
  ipAddress: '127.0.0.1',
};

const ONE_PAGE: PagedResponse<AuditLogResponse> = { content: [MOCK_ENTRY], totalElements: 1 };
const EMPTY_PAGE: PagedResponse<AuditLogResponse> = { content: [], totalElements: 0 };

describe('AuditLogsComponent', () => {
  let component: AuditLogsComponent;
  let auditLogsService: jest.Mocked<AuditLogsService>;
  let snackBar: jest.Mocked<Pick<MatSnackBar, 'open'>>;

  beforeEach(async () => {
    auditLogsService = {
      list: jest.fn().mockResolvedValue(ONE_PAGE),
    } as unknown as jest.Mocked<AuditLogsService>;

    snackBar = { open: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [AuditLogsComponent],
      providers: [
        { provide: AuditLogsService, useValue: auditLogsService },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    })
      .overrideTemplate(AuditLogsComponent, '')
      .compileComponents();

    const fixture = TestBed.createComponent(AuditLogsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await Promise.resolve();
  });

  // ── init ──────────────────────────────────────────────────────────────────

  it('carrega logs de auditoria no ngOnInit com pageSize=25', () => {
    expect(component.paged.size()).toBe(25);
    expect(auditLogsService.list).toHaveBeenCalledWith(0, 25, { action: undefined, userId: undefined });
    expect(component.paged.rows()).toEqual([MOCK_ENTRY]);
    expect(component.paged.total()).toBe(1);
    expect(component.paged.loading()).toBe(false);
  });

  it('availableActions contém lista estática de ações conhecidas', () => {
    expect(component.availableActions.length).toBeGreaterThan(0);
    expect(component.availableActions).toContain('USER_LOGGED_IN');
    expect(component.availableActions).toContain('USER_DELETED');
  });

  it('exibe snackbar de erro se o carregamento falhar', async () => {
    auditLogsService.list.mockRejectedValueOnce(new Error('network'));
    await (component as any).load();
    expect(snackBar.open).toHaveBeenCalledWith(
      'Erro ao carregar logs de auditoria.',
      'OK',
      { duration: 3000 },
    );
  });

  // ── paginação ─────────────────────────────────────────────────────────────

  it('onPage atualiza page/size e recarrega', async () => {
    jest.clearAllMocks();
    auditLogsService.list.mockResolvedValue(EMPTY_PAGE);

    component.onPage({ pageIndex: 1, pageSize: 50, length: 200 });
    await Promise.resolve();

    expect(component.paged.page()).toBe(1);
    expect(component.paged.size()).toBe(50);
    expect(auditLogsService.list).toHaveBeenCalledWith(1, 50, { action: undefined, userId: undefined });
  });

  // ── filtros ───────────────────────────────────────────────────────────────

  it('load passa userId quando userIdControl está preenchido', async () => {
    jest.clearAllMocks();
    auditLogsService.list.mockResolvedValue(EMPTY_PAGE);
    component.userIdControl.setValue('alice');

    await (component as any).load();
    expect(auditLogsService.list).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Number),
      { action: undefined, userId: 'alice' },
    );
  });

  it('load passa action quando actionControl está preenchido', async () => {
    jest.clearAllMocks();
    auditLogsService.list.mockResolvedValue(EMPTY_PAGE);
    component.actionControl.setValue('USER_CREATED');

    await (component as any).load();
    expect(auditLogsService.list).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Number),
      { action: 'USER_CREATED', userId: undefined },
    );
  });

  it('load passa filtros undefined quando ambos controles estão vazios', async () => {
    jest.clearAllMocks();
    auditLogsService.list.mockResolvedValue(EMPTY_PAGE);
    component.userIdControl.setValue('');
    component.actionControl.setValue('');

    await (component as any).load();
    expect(auditLogsService.list).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Number),
      { action: undefined, userId: undefined },
    );
  });

  // ── badgeClass ────────────────────────────────────────────────────────────

  it('badgeClass retorna classe colorida para ação conhecida', () => {
    expect(component.badgeClass('USER_LOGGED_IN')).toContain('blue');
    expect(component.badgeClass('USER_DELETED')).toContain('red');
  });

  it('badgeClass retorna classe padrão para ação desconhecida', () => {
    expect(component.badgeClass('ACAO_DESCONHECIDA')).toContain('surface-hover');
  });
});
