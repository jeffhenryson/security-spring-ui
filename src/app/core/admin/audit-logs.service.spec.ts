import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuditLogsService } from './audit-logs.service';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

const MOCK_ENTRY = {
  id: 1,
  timestamp: '2026-01-01T00:00:00Z',
  action: 'USER_CREATED',
  who: 'admin',
  target: 'alice',
  ipAddress: '127.0.0.1',
};

describe('AuditLogsService', () => {
  let service: AuditLogsService;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuditLogsService);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it('list() faz GET com page e size corretos', async () => {
    const promise = service.list(0, 20);
    const req = controller.expectOne(`${API}/audit-logs?page=0&size=20`);
    expect(req.request.method).toBe('GET');
    req.flush({ content: [MOCK_ENTRY], totalElements: 1 });
    const result = await promise;
    expect(result.content).toHaveLength(1);
    expect(result.totalElements).toBe(1);
  });

  it('list() inclui action quando fornecido via filters', async () => {
    const promise = service.list(0, 20, { action: 'USER_CREATED' });
    const req = controller.expectOne(`${API}/audit-logs?page=0&size=20&action=USER_CREATED`);
    req.flush({ content: [], totalElements: 0 });
    await promise;
  });

  it('list() inclui userId quando fornecido via filters', async () => {
    const promise = service.list(0, 20, { userId: 'alice' });
    const req = controller.expectOne(`${API}/audit-logs?page=0&size=20&userId=alice`);
    req.flush({ content: [], totalElements: 0 });
    await promise;
  });
});
