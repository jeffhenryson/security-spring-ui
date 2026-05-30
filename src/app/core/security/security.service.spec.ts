import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SecurityService } from './security.service';
import { environment } from '../../../environments/environment';
import { SessionInfo, TotpSetupResponse, TotpConfirmResponse } from '../auth/models/auth.models';

const API = environment.apiUrl;

const MOCK_SESSION: SessionInfo = {
  id: 1,
  createdAt: '2026-01-01T00:00:00Z',
  expiresAt: '2026-02-01T00:00:00Z',
  ipAddress: '127.0.0.1',
  userAgent: 'Mozilla/5.0',
};

describe('SecurityService', () => {
  let service: SecurityService;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SecurityService);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it('loadSessions faz GET /auth/sessions e retorna a lista', async () => {
    const promise = service.loadSessions();
    const req = controller.expectOne(`${API}/auth/sessions`);
    expect(req.request.method).toBe('GET');
    req.flush([MOCK_SESSION]);
    const result = await promise;
    expect(result).toEqual([MOCK_SESSION]);
  });

  it('terminateAllSessions faz DELETE /auth/sessions', async () => {
    const promise = service.terminateAllSessions();
    const req = controller.expectOne(`${API}/auth/sessions`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    await promise;
  });

  it('terminateSession faz DELETE /auth/sessions/{id}', async () => {
    const promise = service.terminateSession(5);
    const req = controller.expectOne(`${API}/auth/sessions/5`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    await promise;
  });

  it('startTotpSetup faz POST /auth/2fa/setup', async () => {
    const setup: TotpSetupResponse = { secret: 'ABCD', otpauthUri: 'otpauth://...' };
    const promise = service.startTotpSetup();
    const req = controller.expectOne(`${API}/auth/2fa/setup`);
    expect(req.request.method).toBe('POST');
    req.flush(setup);
    const result = await promise;
    expect(result).toEqual(setup);
  });

  it('confirmTotpSetup faz POST /auth/2fa/confirm com o código', async () => {
    const confirm: TotpConfirmResponse = { backupCodes: ['a', 'b'] };
    const promise = service.confirmTotpSetup('123456');
    const req = controller.expectOne(`${API}/auth/2fa/confirm`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ code: '123456' });
    req.flush(confirm);
    const result = await promise;
    expect(result).toEqual(confirm);
  });

  it('disableTotp faz DELETE /auth/2fa com senha e código no body', async () => {
    const promise = service.disableTotp({ currentPassword: 'pass', code: '654321' });
    const req = controller.expectOne(`${API}/auth/2fa`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.body).toEqual({ currentPassword: 'pass', code: '654321' });
    req.flush(null);
    await promise;
  });

  it('regenerateBackupCodes faz POST /auth/2fa/backup-codes/regenerate com currentPassword', async () => {
    const response: TotpConfirmResponse = { backupCodes: ['x', 'y'] };
    const promise = service.regenerateBackupCodes('myPassword');
    const req = controller.expectOne(`${API}/auth/2fa/backup-codes/regenerate`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ currentPassword: 'myPassword' });
    req.flush(response);
    const result = await promise;
    expect(result).toEqual(response);
  });
});
