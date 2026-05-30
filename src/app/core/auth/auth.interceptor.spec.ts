import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthStore } from './auth.store';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

/** Drena a fila de microtasks e 1 ciclo de macrotask. */
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let store: AuthStore;
  let router: Router;
  let authService: { initSession: jest.Mock };

  beforeEach(() => {
    authService = { initSession: jest.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigate: jest.fn(), createUrlTree: jest.fn() } },
        { provide: AuthService, useValue: authService },
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    store = TestBed.inject(AuthStore);
    router = TestBed.inject(Router);
    localStorage.clear();
  });

  afterEach(() => {
    controller.verify();
    localStorage.clear();
  });

  // ── Anexar token ──────────────────────────────────────────────────────────

  it('deve anexar Authorization header quando há access token', () => {
    store.setAccessToken('my-token');
    http.get(`${API}/data`).subscribe();
    const req = controller.expectOne(`${API}/data`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer my-token');
    req.flush({});
  });

  it('não deve anexar Authorization header sem token', () => {
    http.get(`${API}/data`).subscribe();
    const req = controller.expectOne(`${API}/data`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  // ── Retry após 401: refresh bem-sucedido ──────────────────────────────────

  it('deve chamar initSession e retentar com novo token ao receber 401', async () => {
    store.setAccessToken('old-token');
    // initSession simula um refresh bem-sucedido: seta novo token na store
    authService.initSession.mockImplementation(async () => {
      store.setAccessToken('new-token');
    });

    http.get(`${API}/protected`).subscribe();

    // 1ª tentativa → 401
    controller
      .expectOne(`${API}/protected`)
      .flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    await flushPromises(); // deixa a promise do initSession resolver

    // Retry com novo token
    const retry = controller.expectOne(`${API}/protected`);
    expect(retry.request.headers.get('Authorization')).toBe('Bearer new-token');
    retry.flush({ ok: true });
  });

  // ── Retry após 401: refresh falha ─────────────────────────────────────────

  it('deve redirecionar para /auth/login quando initSession não recupera token', async () => {
    store.setAccessToken('old-token');
    // initSession simula falha: limpa a store sem setar novo token
    authService.initSession.mockImplementation(async () => {
      store.clear();
    });

    http.get(`${API}/protected`).subscribe({ error: () => {} });

    controller
      .expectOne(`${API}/protected`)
      .flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    await flushPromises();

    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
    expect(store.accessToken()).toBeNull();
  });

  it('deve redirecionar para /auth/login quando initSession lança exceção', async () => {
    store.setAccessToken('old-token');
    authService.initSession.mockRejectedValue(new Error('Network failure'));

    http.get(`${API}/protected`).subscribe({ error: () => {} });

    controller
      .expectOne(`${API}/protected`)
      .flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    await flushPromises();

    expect(store.accessToken()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  // ── Rotas /auth/ não fazem retry ──────────────────────────────────────────

  it('não deve chamar initSession para 401 em rotas /auth/', async () => {
    http.get(`${API}/auth/login`).subscribe({ error: () => {} });
    controller
      .expectOne(`${API}/auth/login`)
      .flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    await flushPromises();
    expect(authService.initSession).not.toHaveBeenCalled();
  });

  // ── Erros não-401 passam direto ───────────────────────────────────────────

  it('deve propagar erro 500 sem chamar initSession', async () => {
    let error: HttpErrorResponse | undefined;
    http.get(`${API}/protected`).subscribe({ error: (e) => (error = e) });
    controller
      .expectOne(`${API}/protected`)
      .flush('Error', { status: 500, statusText: 'Internal Server Error' });
    await flushPromises();
    expect(authService.initSession).not.toHaveBeenCalled();
    expect(error?.status).toBe(500);
  });
});
