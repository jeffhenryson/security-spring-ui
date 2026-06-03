import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DashboardComponent } from './dashboard.component';
import { StatsService, StatsResponse } from '../../core/admin/stats.service';
import { AuditLogsService } from '../../core/admin/audit-logs.service';
import { AuthStore } from '../../core/auth/auth.store';

const MOCK_STATS: StatsResponse = {
  totalUsers: 10,
  activeUsers: 8,
  totalRoles: 3,
  totalPermissions: 14,
};

const BASE_USER = {
  id: 1,
  username: 'alice',
  email: 'alice@example.com',
  enabled: true,
  emailVerified: true,
  pendingEmail: null as string | null,
  roles: [] as string[],
  permissions: [] as string[],
};

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let statsService: jest.Mocked<Pick<StatsService, 'get'>>;
  let snackBar: jest.Mocked<Pick<MatSnackBar, 'open'>>;
  let store: AuthStore;

  function setup(permissions: string[] = []) {
    statsService = { get: jest.fn().mockResolvedValue(MOCK_STATS) };
    snackBar = { open: jest.fn() };
    const auditLogsService = { list: jest.fn().mockResolvedValue({ content: [] }) };

    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: StatsService, useValue: statsService },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: AuditLogsService, useValue: auditLogsService },
      ],
    })
      .overrideTemplate(DashboardComponent, '')
      .compileComponents();

    store = TestBed.inject(AuthStore);
    store.setCurrentUser({ ...BASE_USER, permissions });

    const fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
  }

  beforeEach(() => TestBed.resetTestingModule());

  // ── fetchStats condicional ─────────────────────────────────────────────────

  it('não chama statsService quando usuário sem USER_READ e sem ROLE_READ', async () => {
    setup([]);
    component.ngOnInit();
    await Promise.resolve();
    expect(statsService.get).not.toHaveBeenCalled();
  });

  it('chama statsService.get quando usuário tem USER_READ', async () => {
    setup(['USER_READ']);
    component.ngOnInit();
    await Promise.resolve();
    expect(statsService.get).toHaveBeenCalled();
  });

  it('chama statsService.get quando usuário tem ROLE_READ', async () => {
    setup(['ROLE_READ']);
    component.ngOnInit();
    await Promise.resolve();
    expect(statsService.get).toHaveBeenCalled();
  });

  // ── estado após carregamento ───────────────────────────────────────────────

  it('preenche stats() e desativa loading após sucesso', async () => {
    setup(['USER_READ']);
    component.ngOnInit();
    await Promise.resolve();
    expect(component.stats()).toEqual(MOCK_STATS);
    expect(component.statsLoading()).toBe(false);
    expect(component.statsError()).toBe(false);
  });

  it('define statsError true e exibe snackbar após falha', async () => {
    setup(['USER_READ']);
    statsService.get.mockRejectedValueOnce(new Error('network'));
    component.ngOnInit();
    await Promise.resolve();
    expect(component.stats()).toBeNull();
    expect(component.statsError()).toBe(true);
    expect(snackBar.open).toHaveBeenCalledWith('Erro ao carregar estatísticas.', 'OK', {
      duration: 3000,
    });
  });

  // ── computed signals derivados do store ───────────────────────────────────

  it('username deriva do currentUser', () => {
    setup([]);
    expect(component.username()).toBe('alice');
  });

  it('emailUnverified = true quando email não verificado', () => {
    setup([]);
    store.setCurrentUser({ ...BASE_USER, emailVerified: false });
    expect(component.emailUnverified()).toBe(true);
  });

  it('emailUnverified = false quando email verificado', () => {
    setup([]);
    expect(component.emailUnverified()).toBe(false);
  });

  it('totalPermissions reflete número de permissões do store', () => {
    setup(['USER_READ', 'ROLE_READ']);
    expect(component.totalPermissions()).toBe(2);
  });

  it('hasPendingEmail = true quando há pendingEmail', () => {
    setup([]);
    store.setCurrentUser({ ...BASE_USER, pendingEmail: 'new@example.com' });
    expect(component.hasPendingEmail()).toBe(true);
  });
});
