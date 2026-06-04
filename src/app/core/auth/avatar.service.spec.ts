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

/** Mock de Image que dispara onload assincronamente ao setar src. */
class MockImage {
  private _src = '';
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  width = 100;
  height = 100;
  set src(value: string) {
    this._src = value;
    Promise.resolve().then(() => this.onload?.());
  }
  get src() { return this._src; }
}

describe('AvatarService', () => {
  let service: AvatarService;
  let store: AuthStore;
  let controller: HttpTestingController;
  const FAKE_DATA_URL = 'data:image/jpeg;base64,resized';

  beforeEach(() => {
    localStorage.clear();

    jest.spyOn(global, 'Image' as keyof typeof global).mockImplementation(
      () => new MockImage() as unknown as HTMLImageElement,
    );
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: jest.fn(),
    } as unknown as CanvasRenderingContext2D);
    jest.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(FAKE_DATA_URL);
    global.URL.createObjectURL = jest.fn().mockReturnValue('blob:fake-url');
    global.URL.revokeObjectURL = jest.fn();

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
    jest.restoreAllMocks();
    controller.verify();
    localStorage.clear();
  });

  it('retorna null quando não há usuário logado', () => {
    expect(service.currentAvatar()).toBeNull();
  });

  it('retorna null quando usuário está logado mas não há avatar salvo', () => {
    store.setCurrentUser(MOCK_USER);
    TestBed.flushEffects();
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
    TestBed.flushEffects();
    expect(service.currentAvatar()).toBeNull();

    store.setCurrentUser(MOCK_USER);
    TestBed.flushEffects();
    expect(service.currentAvatar()).toBe('data:image/jpeg;base64,user42');
  });

  it('prefere localStorage sobre avatarUrl do backend', () => {
    localStorage.setItem(`${AVATAR_KEY_PREFIX}42`, 'data:image/jpeg;base64,local');
    store.setCurrentUser({ ...MOCK_USER, avatarUrl: 'http://backend/avatar' });
    TestBed.flushEffects();
    expect(service.currentAvatar()).toBe('data:image/jpeg;base64,local');
  });

  // ── fetchAndCache: HTTP + resize ──────────────────────────────────────────

  it('fetchAndCache: faz GET, redimensiona blob e atualiza signal + localStorage', async () => {
    store.setCurrentUser({ ...MOCK_USER, avatarUrl: 'http://backend/avatar.jpg' });
    TestBed.flushEffects();
    await Promise.resolve();

    const req = controller.expectOne('http://backend/avatar.jpg');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['img'], { type: 'image/jpeg' }));

    // Aguarda resizeToDataUrl: Promise.resolve (Image.onload) + microtasks do await
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(service.currentAvatar()).toBe(FAKE_DATA_URL);
    expect(localStorage.getItem(`${AVATAR_KEY_PREFIX}42`)).toBe(FAKE_DATA_URL);
  });

  it('fetchAndCache: erro HTTP não quebra o serviço (silent fail)', async () => {
    store.setCurrentUser({ ...MOCK_USER, avatarUrl: 'http://backend/avatar.jpg' });
    TestBed.flushEffects();
    await Promise.resolve();

    controller.expectOne('http://backend/avatar.jpg').error(
      new ProgressEvent('error'),
      { status: 404, statusText: 'Not Found' },
    );
    await Promise.resolve();

    expect(service.currentAvatar()).toBeNull();
  });
});
