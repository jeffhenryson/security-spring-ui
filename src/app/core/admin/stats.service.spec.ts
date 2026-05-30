import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { StatsService } from './stats.service';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

describe('StatsService', () => {
  let service: StatsService;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(StatsService);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it('get() faz GET em /stats e retorna StatsResponse', async () => {
    const payload = { totalUsers: 10, activeUsers: 8, totalRoles: 3, totalPermissions: 14 };
    const promise = service.get();
    const req = controller.expectOne(`${API}/stats`);
    expect(req.request.method).toBe('GET');
    req.flush(payload);
    const result = await promise;
    expect(result).toEqual(payload);
  });
});
