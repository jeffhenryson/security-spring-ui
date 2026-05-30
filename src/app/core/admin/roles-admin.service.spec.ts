import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RolesAdminService } from './roles-admin.service';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

const ROLE_A = { name: 'ADMIN', permissions: ['USER_READ', 'USER_CREATE'] };
const ROLE_B = { name: 'VIEWER', permissions: ['USER_READ'] };

describe('RolesAdminService', () => {
  let service: RolesAdminService;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RolesAdminService);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it('list() retorna Page<Role>', async () => {
    const promise = service.list(0, 10);
    const req = controller.expectOne(`${API}/roles?page=0&size=10`);
    expect(req.request.method).toBe('GET');
    req.flush({ content: [ROLE_A], totalElements: 1 });
    const result = await promise;
    expect(result.content[0].name).toBe('ADMIN');
  });

  it('listAll() retorna todos os itens em página única', async () => {
    const promise = service.listAll();
    const req = controller.expectOne(`${API}/roles?page=0&size=100`);
    req.flush({ content: [ROLE_A, ROLE_B], totalElements: 2 });
    const result = await promise;
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.name)).toEqual(['ADMIN', 'VIEWER']);
  });

  it('listAll() busca múltiplas páginas quando totalElements > PAGE_SIZE', async () => {
    const promise = service.listAll();
    const first = controller.expectOne(`${API}/roles?page=0&size=100`);
    first.flush({ content: [ROLE_A], totalElements: 101 });
    await flushPromises();
    const second = controller.expectOne(`${API}/roles?page=1&size=100`);
    second.flush({ content: [ROLE_B], totalElements: 101 });
    const result = await promise;
    expect(result).toHaveLength(2);
  });

  it('create() faz POST e retorna Role', async () => {
    const promise = service.create('MODERATOR');
    const req = controller.expectOne(`${API}/roles`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'MODERATOR' });
    req.flush({ name: 'MODERATOR', permissions: [] });
    const result = await promise;
    expect(result.name).toBe('MODERATOR');
  });

  it('remove() faz DELETE no endpoint correto', async () => {
    const promise = service.remove('ADMIN');
    const req = controller.expectOne(`${API}/roles/ADMIN`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    await promise;
  });

  it('addPermission() faz POST no endpoint correto', async () => {
    const promise = service.addPermission('ADMIN', 'USER_DELETE');
    const req = controller.expectOne(`${API}/roles/ADMIN/permissions/USER_DELETE`);
    expect(req.request.method).toBe('POST');
    req.flush(null);
    await promise;
  });

  it('removePermission() faz DELETE no endpoint correto', async () => {
    const promise = service.removePermission('ADMIN', 'USER_DELETE');
    const req = controller.expectOne(`${API}/roles/ADMIN/permissions/USER_DELETE`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    await promise;
  });
});
