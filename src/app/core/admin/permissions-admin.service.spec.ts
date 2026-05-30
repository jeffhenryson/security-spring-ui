import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PermissionsAdminService } from './permissions-admin.service';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

const PERM_A = { id: 1, name: 'USER_READ' };
const PERM_B = { id: 2, name: 'USER_CREATE' };

describe('PermissionsAdminService', () => {
  let service: PermissionsAdminService;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PermissionsAdminService);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it('list() retorna Page<Permission>', async () => {
    const promise = service.list(0, 10);
    const req = controller.expectOne(`${API}/permissions?page=0&size=10`);
    expect(req.request.method).toBe('GET');
    req.flush({ content: [PERM_A], totalElements: 1 });
    const result = await promise;
    expect(result.content[0].name).toBe('USER_READ');
  });

  it('listAll() retorna todos os itens em página única', async () => {
    const promise = service.listAll();
    const req = controller.expectOne(`${API}/permissions?page=0&size=100`);
    req.flush({ content: [PERM_A, PERM_B], totalElements: 2 });
    const result = await promise;
    expect(result).toHaveLength(2);
  });

  it('listAll() busca múltiplas páginas quando totalElements > PAGE_SIZE', async () => {
    const promise = service.listAll();
    const first = controller.expectOne(`${API}/permissions?page=0&size=100`);
    first.flush({ content: [PERM_A], totalElements: 101 });
    await flushPromises();
    const second = controller.expectOne(`${API}/permissions?page=1&size=100`);
    second.flush({ content: [PERM_B], totalElements: 101 });
    const result = await promise;
    expect(result).toHaveLength(2);
  });

  it('create() faz POST e retorna Permission', async () => {
    const promise = service.create('REPORT_READ');
    const req = controller.expectOne(`${API}/permissions`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'REPORT_READ' });
    req.flush({ id: 3, name: 'REPORT_READ' });
    const result = await promise;
    expect(result.name).toBe('REPORT_READ');
  });

  it('remove() faz DELETE no endpoint correto', async () => {
    const promise = service.remove('USER_READ');
    const req = controller.expectOne(`${API}/permissions/USER_READ`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    await promise;
  });
});
