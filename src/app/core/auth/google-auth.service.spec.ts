import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { GoogleAuthService } from './google-auth.service';
import { ApiConfiguration } from '../../api/api-configuration';
import { environment } from '../../../environments/environment';

jest.mock('../../../environments/environment', () => ({
  environment: { googleClientId: 'test-client-id', apiUrl: 'http://localhost:8080' },
}));

describe('GoogleAuthService', () => {
  let service: GoogleAuthService;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ApiConfiguration, useValue: { rootUrl: 'http://localhost:8080' } },
      ],
    });

    service = TestBed.inject(GoogleAuthService);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  // ── isConfigured ─────────────────────────────────────────────────────────

  it('isConfigured retorna true quando googleClientId está definido', () => {
    expect(service.isConfigured).toBe(true);
  });

  it('isConfigured retorna false quando googleClientId está vazio', () => {
    const original = environment.googleClientId;
    (environment as any).googleClientId = '';
    expect(service.isConfigured).toBe(false);
    (environment as any).googleClientId = original;
  });

  // ── promptForToken ────────────────────────────────────────────────────────

  it('promptForToken rejeita imediatamente quando não configurado', async () => {
    (environment as any).googleClientId = '';
    await expect(service.promptForToken()).rejects.toThrow('GOOGLE_CLIENT_ID não configurado');
    (environment as any).googleClientId = 'test-client-id';
  });

  it('promptForToken chama google.accounts.id.initialize com o client_id correto', () => {
    const initMock = jest.fn();
    const promptMock = jest.fn();
    (globalThis as any).google = {
      accounts: { id: { initialize: initMock, prompt: promptMock } },
    };

    service.promptForToken();

    expect(initMock).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: 'test-client-id' }),
    );
    delete (globalThis as any).google;
  });

  it('promptForToken resolve com o credential quando callback é chamado', async () => {
    let capturedCallback: ((r: { credential: string }) => void) | null = null;
    (globalThis as any).google = {
      accounts: {
        id: {
          initialize: (opts: { callback: (r: { credential: string }) => void }) => {
            capturedCallback = opts.callback;
          },
          prompt: jest.fn(),
        },
      },
    };

    const promise = service.promptForToken();
    capturedCallback!({ credential: 'id-token-xyz' });

    await expect(promise).resolves.toBe('id-token-xyz');
    delete (globalThis as any).google;
  });

  // ── exchangeToken ─────────────────────────────────────────────────────────

  it('exchangeToken faz POST para /auth/oauth2/google com o idToken', async () => {
    const mockPair = { accessToken: 'acc', tokenType: 'Bearer', expiresIn: 900 };
    const promise = service.exchangeToken('id-token-abc');

    const req = controller.expectOne('http://localhost:8080/auth/oauth2/google');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ idToken: 'id-token-abc' });
    expect(req.request.withCredentials).toBe(true);
    req.flush(mockPair);

    await expect(promise).resolves.toEqual(mockPair);
  });

  it('exchangeToken rejeita se a requisição falhar', async () => {
    const promise = service.exchangeToken('bad-token');
    controller.expectOne('http://localhost:8080/auth/oauth2/google').flush(
      { error: 'invalid_token' },
      { status: 401, statusText: 'Unauthorized' },
    );
    await expect(promise).rejects.toBeDefined();
  });
});
