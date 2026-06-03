import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AvatarService, AVATAR_KEY_PREFIX } from './avatar.service';
import { AuthStore } from './auth.store';
import { CurrentUser } from './models/auth.models';

const MOCK_USER: CurrentUser = {
  id: 42,
  username: 'alice',
  email: 'alice@example.com',
  enabled: true,
  emailVerified: true,
  pendingEmail: null,
  roles: [],
  permissions: [],
};

describe('AvatarService', () => {
  let service: AvatarService;
  let store: AuthStore;
  let controller: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([])),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AvatarService);
    store = TestBed.inject(AuthStore);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    controller.verify();
    localStorage.clear();
  });

  it('retorna null quando não há usuário logado', () => {
    expect(service.currentAvatar()).toBeNull();
  });

  it('retorna null quando usuário está logado mas não há avatar salvo', () => {
    store.setCurrentUser(MOCK_USER);
    expect(service.currentAvatar()).toBeNull();
  });

  it('setLocalAvatar armazena o dataUrl no localStorage e atualiza o signal', () => {
    store.setCurrentUser(MOCK_USER);
    service.setLocalAvatar('data:image/jpeg;base64,abc');
    expect(service.currentAvatar()).toBe('data:image/jpeg;base64,abc');
    expect(localStorage.getItem(`${AVATAR_KEY_PREFIX}42`)).toBe('data:image/jpeg;base64,abc');
  });

  it('clearLocalAvatar limpa o localStorage e o signal', () => {
    store.setCurrentUser(MOCK_USER);
    service.setLocalAvatar('data:image/jpeg;base64,abc');
    service.clearLocalAvatar();
    expect(service.currentAvatar()).toBeNull();
    expect(localStorage.getItem(`${AVATAR_KEY_PREFIX}42`)).toBeNull();
  });

  it('setLocalAvatar sem usuário logado não faz nada', () => {
    service.setLocalAvatar('data:image/jpeg;base64,abc');
    expect(service.currentAvatar()).toBeNull();
    expect(localStorage.getItem(`${AVATAR_KEY_PREFIX}42`)).toBeNull();
  });

  it('clearLocalAvatar sem usuário logado não causa erro', () => {
    expect(() => service.clearLocalAvatar()).not.toThrow();
  });

  it('não vaza avatar entre usuários diferentes', () => {
    store.setCurrentUser(MOCK_USER);
    service.setLocalAvatar('data:image/jpeg;base64,user42');

    store.setCurrentUser({ ...MOCK_USER, id: 99 });
    expect(service.currentAvatar()).toBeNull();

    store.setCurrentUser(MOCK_USER);
    expect(service.currentAvatar()).toBe('data:image/jpeg;base64,user42');
  });

  it('prefere localStorage sobre avatarUrl do backend', () => {
    localStorage.setItem(`${AVATAR_KEY_PREFIX}42`, 'data:image/jpeg;base64,local');
    store.setCurrentUser({ ...MOCK_USER, avatarUrl: 'http://backend/avatar' });
    expect(service.currentAvatar()).toBe('data:image/jpeg;base64,local');
  });

  // ── fetchAndCache: HTTP + FileReader ───────────────────────────────────────

  it('fetchAndCache: faz GET, converte blob e atualiza signal + localStorage', async () => {
    const mockDataUrl = 'data:image/jpeg;base64,frombackend';

    // Simula FileReader: quando readAsDataURL é chamado, dispara onload com o dataUrl
    const fileReaderMock = {
      result: mockDataUrl,
      onload: null as (() => void) | null,
      onerror: null as (() => void) | null,
      readAsDataURL: jest.fn().mockImplementation(function (this: typeof fileReaderMock) {
        Promise.resolve().then(() => this.onload?.());
      }),
    };
    jest
      .spyOn(global, 'FileReader' as keyof typeof global)
      .mockImplementation(() => fileReaderMock as unknown as FileReader);

    // Usuário com avatarUrl e sem cache local
    store.setCurrentUser({ ...MOCK_USER, avatarUrl: 'http://backend/avatar.jpg' });

    // Aguarda o effect() disparar e a chamada HTTP ser enfileirada
    await Promise.resolve();

    const req = controller.expectOne('http://backend/avatar.jpg');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['img'], { type: 'image/jpeg' }));

    // Aguarda FileReader.onload e a atualização do signal
    await Promise.resolve();
    await Promise.resolve();

    expect(service.currentAvatar()).toBe(mockDataUrl);
    expect(localStorage.getItem(`${AVATAR_KEY_PREFIX}42`)).toBe(mockDataUrl);

    jest.restoreAllMocks();
  });

  it('fetchAndCache: erro HTTP não quebra o serviço (silent fail)', async () => {
    store.setCurrentUser({ ...MOCK_USER, avatarUrl: 'http://backend/avatar.jpg' });
    await Promise.resolve();

    controller.expectOne('http://backend/avatar.jpg').flush(
      'Not Found',
      { status: 404, statusText: 'Not Found' },
    );
    await Promise.resolve();

    // Continua retornando null sem lançar erro
    expect(service.currentAvatar()).toBeNull();
  });
});
