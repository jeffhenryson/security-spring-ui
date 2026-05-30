import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProfileService } from './profile.service';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

describe('ProfileService', () => {
  let service: ProfileService;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProfileService);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  describe('updateProfile', () => {
    it('faz PATCH /users/me com os dados do perfil', async () => {
      const promise = service.updateProfile({
        username: 'alice',
        email: 'alice@example.com',
        currentPassword: 'secret',
      });

      const req = controller.expectOne(`${API}/users/me`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({
        username: 'alice',
        email: 'alice@example.com',
        currentPassword: 'secret',
      });
      req.flush(null);
      await promise;
    });
  });

  describe('changePassword', () => {
    it('faz PUT /users/me/password com as senhas', async () => {
      const promise = service.changePassword({
        currentPassword: 'old123',
        newPassword: 'new456',
      });

      const req = controller.expectOne(`${API}/users/me/password`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ currentPassword: 'old123', newPassword: 'new456' });
      req.flush(null);
      await promise;
    });
  });
});
