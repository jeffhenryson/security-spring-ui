import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { SessionsComponent } from './sessions.component';
import { AuthStore } from '../../../../core/auth/auth.store';
import { SecurityService } from '../../../../core/security/security.service';
import { SessionInfo } from '../../../../core/auth/models/auth.models';

const MOCK_SESSION: SessionInfo = {
  id: 10,
  createdAt: '2026-01-01T00:00:00Z',
  expiresAt: '2026-02-01T00:00:00Z',
  ipAddress: '127.0.0.1',
  userAgent: 'Mozilla/5.0',
};

function makeDialogRef(result: unknown) {
  return { afterClosed: () => of(result) } as unknown as MatDialogRef<unknown>;
}

describe('SessionsComponent', () => {
  let component: SessionsComponent;
  let securityService: jest.Mocked<SecurityService>;
  let snackBar: jest.Mocked<Pick<MatSnackBar, 'open'>>;
  let router: jest.Mocked<Pick<Router, 'navigate'>>;
  let dialog: jest.Mocked<Pick<MatDialog, 'open'>>;

  beforeEach(async () => {
    securityService = {
      loadSessions: jest.fn().mockResolvedValue([MOCK_SESSION]),
      terminateAllSessions: jest.fn().mockResolvedValue(undefined),
      terminateSession: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<SecurityService>;

    snackBar = { open: jest.fn() };
    router = { navigate: jest.fn() };
    dialog = { open: jest.fn().mockReturnValue(makeDialogRef(true)) };

    await TestBed.configureTestingModule({
      imports: [SessionsComponent],
      providers: [
        { provide: SecurityService, useValue: securityService },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: Router, useValue: router },
        { provide: MatDialog, useValue: dialog },
      ],
    })
      .overrideTemplate(SessionsComponent, '')
      .compileComponents();

    const fixture = TestBed.createComponent(SessionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await Promise.resolve();
  });

  afterEach(() => localStorage.clear());

  it('carrega sessões no ngOnInit', async () => {
    expect(securityService.loadSessions).toHaveBeenCalled();
    expect(component.sessions()).toHaveLength(1);
    expect(component.loading()).toBe(false);
  });

  describe('quando loadSessions falha', () => {
    let failComp: SessionsComponent;

    beforeEach(async () => {
      securityService.loadSessions.mockRejectedValueOnce(new Error('network'));
      const fix = TestBed.createComponent(SessionsComponent);
      failComp = fix.componentInstance;
      fix.detectChanges();
      await Promise.resolve();
    });

    it('define sessions como [] e exibe snackbar de erro', () => {
      expect(failComp.sessions()).toHaveLength(0);
      expect(snackBar.open).toHaveBeenCalledWith(
        'Não foi possível carregar as sessões ativas.',
        'OK',
        { duration: 4000 },
      );
    });
  });

  describe('terminateOne', () => {
    it('remove a sessão da lista e exibe snackbar', async () => {
      await component.terminateOne(MOCK_SESSION);
      expect(securityService.terminateSession).toHaveBeenCalledWith(10);
      expect(component.sessions()).toHaveLength(0);
      expect(snackBar.open).toHaveBeenCalledWith('Sessão encerrada.', 'OK', { duration: 2000 });
      expect(component.revokingId()).toBeNull();
    });

    it('exibe snackbar de erro e limpa revokingId se falhar', async () => {
      securityService.terminateSession.mockRejectedValue(new Error('fail'));
      await component.terminateOne(MOCK_SESSION);
      expect(component.sessions()).toHaveLength(1);
      expect(snackBar.open).toHaveBeenCalledWith(
        'Erro ao encerrar sessão. Tente novamente.',
        'OK',
        { duration: 3000 },
      );
      expect(component.revokingId()).toBeNull();
    });
  });

  describe('terminateAll', () => {
    it('redireciona para /auth/login após confirmar e encerrar todas', async () => {
      await component.terminateAll();
      expect(securityService.terminateAllSessions).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
      expect(component.terminatingAll()).toBe(false);
    });

    it('não chama terminateAllSessions se o dialog for cancelado', async () => {
      dialog.open.mockReturnValue(makeDialogRef(false));
      await component.terminateAll();
      expect(securityService.terminateAllSessions).not.toHaveBeenCalled();
    });

    it('exibe snackbar de erro e não redireciona se o serviço falhar', async () => {
      securityService.terminateAllSessions.mockRejectedValue(new Error('fail'));
      await component.terminateAll();
      expect(router.navigate).not.toHaveBeenCalled();
      expect(snackBar.open).toHaveBeenCalledWith(
        'Erro ao encerrar sessões. Tente novamente.',
        'OK',
        { duration: 3000 },
      );
    });
  });
});
