import { TestBed } from '@angular/core/testing';
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

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(AvatarService);
    store = TestBed.inject(AuthStore);
  });

  afterEach(() => localStorage.clear());

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
});
