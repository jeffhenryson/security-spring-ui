import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UsersAdminService } from './users-admin.service';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

const MOCK_USER = {
  id: 1,
  username: 'alice',
  email: 'alice@example.com',
  enabled: true,
  emailVerified: true,
  roles: ['ADMIN'],
};

describe('UsersAdminService', () => {
  let service: UsersAdminService;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UsersAdminService);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it('list() envia page, size e retorna Page<User>', async () => {
    const promise = service.list(0, 10);
    const req = controller.expectOne(`${API}/users?page=0&size=10`);
    expect(req.request.method).toBe('GET');
    req.flush({ content: [MOCK_USER], totalElements: 1 });
    const result = await promise;
    expect(result.content).toHaveLength(1);
    expect(result.totalElements).toBe(1);
  });

  it('list() inclui filtro search quando fornecido', async () => {
    const promise = service.list(0, 10, { search: 'alice' });
    const req = controller.expectOne(`${API}/users?page=0&size=10&search=alice`);
    req.flush({ content: [], totalElements: 0 });
    await promise;
  });

  it('list() inclui filtro enabled quando fornecido', async () => {
    const promise = service.list(0, 10, { enabled: false });
    const req = controller.expectOne(`${API}/users?page=0&size=10&enabled=false`);
    req.flush({ content: [], totalElements: 0 });
    await promise;
  });

  it('create() faz POST e retorna User criado', async () => {
    const payload = { username: 'bob', email: 'bob@example.com', password: '123456', roles: [] };
    const promise = service.create(payload);
    const req = controller.expectOne(`${API}/users`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ ...MOCK_USER, username: 'bob' });
    const result = await promise;
    expect(result.username).toBe('bob');
  });

  it('update() faz PATCH no endpoint correto', async () => {
    const promise = service.update(1, { username: 'alice2', email: 'a2@example.com' });
    const req = controller.expectOne(`${API}/users/1`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ ...MOCK_USER, username: 'alice2' });
    await promise;
  });

  it('remove() faz DELETE no endpoint correto', async () => {
    const promise = service.remove(1);
    const req = controller.expectOne(`${API}/users/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    await promise;
  });

  it('enable() faz PUT /enable', async () => {
    const promise = service.enable(1);
    const req = controller.expectOne(`${API}/users/1/enable`);
    expect(req.request.method).toBe('PUT');
    req.flush(null);
    await promise;
  });

  it('disable() faz PUT /disable', async () => {
    const promise = service.disable(1);
    const req = controller.expectOne(`${API}/users/1/disable`);
    expect(req.request.method).toBe('PUT');
    req.flush(null);
    await promise;
  });

  it('assignRole() faz POST no endpoint correto', async () => {
    const promise = service.assignRole('alice', 'ADMIN');
    const req = controller.expectOne(`${API}/users/alice/roles/ADMIN`);
    expect(req.request.method).toBe('POST');
    req.flush(null);
    await promise;
  });
});
