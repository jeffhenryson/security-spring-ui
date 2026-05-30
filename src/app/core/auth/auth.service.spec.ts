import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';
import { REFRESH_TOKEN_KEY } from './auth.constants';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

const TOKEN_PAIR = {
  accessToken: 'access-abc',
  refreshToken: 'refresh-xyz',
  tokenType: 'Bearer' as const,
  expiresIn: 3600,
};

const MOCK_USER = {
  id: 1,
  username: 'alice',
  email: 'alice@example.com',
  enabled: true,
  emailVerified: true,
  pendingEmail: null,
  roles: ['ADMIN'],
  permissions: ['USER_READ'],
};

/** Drena microtasks pendentes. Necessário em app zoneless. */
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('AuthService', () => {
  let service: AuthService;
  let controller: HttpTestingController;
  let store: AuthStore;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigate: jest.fn() } },
      ],
    });
    service = TestBed.inject(AuthService);
    controller = TestBed.inject(HttpTestingController);
    store = TestBed.inject(AuthStore);
    router = TestBed.inject(Router);
    localStorage.clear();
  });

  afterEach(() => {
    controller.verify();
    localStorage.clear();
  });

  // ── login ─────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('deve setar access token e carregar usuário em login normal', async () => {
      const promise = service.login({ username: 'alice', password: 'secret' });

      controller.expectOne(`${API}/auth/login`).flush(TOKEN_PAIR);
      await flushPromises(); // aguarda handleTokenPair → loadCurrentUser

      controller.expectOne(`${API}/users/me`).flush(MOCK_USER);
      await promise;

      expect(store.accessToken()).toBe('access-abc');
      expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('refresh-xyz');
      expect(store.currentUser()?.username).toBe('alice');
    });

    it('deve retornar desafio 2FA sem setar token', async () => {
      const challenge = {
        status: 'PENDING_2FA',
        challengeToken: 'challenge-tok',
        expiresInSeconds: 300,
      };
      const promise = service.login({ username: 'alice', password: 'secret' });

      controller.expectOne(`${API}/auth/login`).flush(challenge);
      const result = await promise;

      expect(store.accessToken()).toBeNull();
      expect(result).toEqual(challenge);
    });

    it('deve propagar erro de credenciais inválidas', async () => {
      const promise = service.login({ username: 'x', password: 'wrong' });
      controller
        .expectOne(`${API}/auth/login`)
        .flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
      await expect(promise).rejects.toBeTruthy();
    });
  });

  // ── verify2FA ─────────────────────────────────────────────────────────────

  describe('verify2FA', () => {
    it('deve setar token e carregar usuário após 2FA correto', async () => {
      const promise = service.verify2FA({ challengeToken: 'ch-tok', code: '123456' });

      controller.expectOne(`${API}/auth/2fa/verify`).flush(TOKEN_PAIR);
      await flushPromises();

      controller.expectOne(`${API}/users/me`).flush(MOCK_USER);
      await promise;

      expect(store.accessToken()).toBe('access-abc');
      expect(store.currentUser()?.username).toBe('alice');
    });

    it('deve propagar erro de código 2FA inválido', async () => {
      const promise = service.verify2FA({ challengeToken: 'ch-tok', code: '000000' });
      controller
        .expectOne(`${API}/auth/2fa/verify`)
        .flush('Bad Request', { status: 400, statusText: 'Bad Request' });
      await expect(promise).rejects.toBeTruthy();
    });
  });

  // ── logout ────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('deve limpar a store e redirecionar mesmo que o POST falhe (500)', async () => {
      store.setAccessToken('tok');
      localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-tok');

      const promise = service.logout();
      controller
        .expectOne(`${API}/auth/logout`)
        .flush('Error', { status: 500, statusText: 'Server Error' });
      await promise;

      expect(store.accessToken()).toBeNull();
      expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
      expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
    });

    it('deve limpar a store e redirecionar após logout bem-sucedido', async () => {
      store.setAccessToken('tok');
      localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-tok');

      const promise = service.logout();
      controller.expectOne(`${API}/auth/logout`).flush({});
      await promise;

      expect(store.accessToken()).toBeNull();
      expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
    });

    it('não deve chamar POST /logout se não há refresh token', async () => {
      await service.logout();
      controller.expectNone(`${API}/auth/logout`);
      expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
    });
  });

  // ── initSession ───────────────────────────────────────────────────────────

  describe('initSession', () => {
    it('deve restaurar sessão quando há refresh token válido', async () => {
      localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-tok');

      const promise = service.initSession();

      controller.expectOne(`${API}/auth/refresh`).flush(TOKEN_PAIR);
      await flushPromises();

      controller.expectOne(`${API}/users/me`).flush(MOCK_USER);
      await promise;

      expect(store.accessToken()).toBe('access-abc');
      expect(store.currentUser()?.username).toBe('alice');
    });

    it('deve limpar a store quando refresh token é inválido', async () => {
      store.setAccessToken('stale-token');
      localStorage.setItem(REFRESH_TOKEN_KEY, 'bad-refresh');

      const promise = service.initSession();
      controller
        .expectOne(`${API}/auth/refresh`)
        .flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
      await promise;

      expect(store.accessToken()).toBeNull();
    });

    it('não deve fazer nenhum request quando não há refresh token', async () => {
      await service.initSession();
      controller.expectNone(`${API}/auth/refresh`);
    });

    it('não deve fazer dois requests de refresh quando chamado concorrentemente', async () => {
      localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-tok');

      const p1 = service.initSession();
      const p2 = service.initSession();

      // Apenas um request deve ter sido aberto
      const reqs = controller.match(`${API}/auth/refresh`);
      expect(reqs).toHaveLength(1);
      reqs[0].flush(TOKEN_PAIR);

      await flushPromises();
      controller.expectOne(`${API}/users/me`).flush(MOCK_USER);

      await Promise.all([p1, p2]);

      expect(store.accessToken()).toBe('access-abc');
    });
  });

  // ── loadCurrentUser ───────────────────────────────────────────────────────

  describe('loadCurrentUser', () => {
    it('deve carregar e setar o usuário atual na store', async () => {
      const promise = service.loadCurrentUser();
      controller.expectOne(`${API}/users/me`).flush(MOCK_USER);
      await promise;
      expect(store.currentUser()).toEqual(MOCK_USER);
    });

    it('deve propagar erro quando /users/me falha', async () => {
      const promise = service.loadCurrentUser();
      controller
        .expectOne(`${API}/users/me`)
        .flush('Forbidden', { status: 403, statusText: 'Forbidden' });
      await expect(promise).rejects.toBeTruthy();
    });
  });
});
