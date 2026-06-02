import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DevLogsComponent } from './dev-logs.component';
import { AuditLogsService } from '../../../core/admin/audit-logs.service';

function makeAuditService() {
  return { list: jest.fn().mockResolvedValue({ content: [], page: 0, size: 25, totalElements: 0, totalPages: 0 }) }
    as unknown as jest.Mocked<AuditLogsService>;
}

describe('DevLogsComponent', () => {
  let component: DevLogsComponent;
  let auditService: jest.Mocked<AuditLogsService>;

  beforeEach(async () => {
    auditService = makeAuditService();
    await TestBed.configureTestingModule({
      imports: [DevLogsComponent],
      providers: [
        { provide: AuditLogsService, useValue: auditService },
        { provide: MatSnackBar, useValue: { open: jest.fn() } },
      ],
    })
      .overrideTemplate(DevLogsComponent, '')
      .compileComponents();

    const fixture = TestBed.createComponent(DevLogsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('cria o componente', () => {
    expect(component).toBeTruthy();
  });

  it('lista de ações disponíveis inclui eventos críticos DEV', () => {
    expect(component.availableActions).toContain('TOKEN_THEFT_DETECTED');
    expect(component.availableActions).toContain('ACCOUNT_LOCKED');
    expect(component.availableActions).toContain('LOGIN_FAILED');
    expect(component.availableActions).toContain('DEV_ELEVATION_COMPLETED');
  });

  it('isCritical retorna true para eventos de segurança', () => {
    expect(component.isCritical('TOKEN_THEFT_DETECTED')).toBe(true);
    expect(component.isCritical('ACCOUNT_LOCKED')).toBe(true);
    expect(component.isCritical('LOGIN_FAILED')).toBe(true);
  });

  it('isCritical retorna false para eventos comuns', () => {
    expect(component.isCritical('USER_LOGGED_IN')).toBe(false);
    expect(component.isCritical('USER_CREATED')).toBe(false);
  });

  it('chama auditLogsService.list no ngOnInit', () => {
    expect(auditService.list).toHaveBeenCalled();
  });
});
