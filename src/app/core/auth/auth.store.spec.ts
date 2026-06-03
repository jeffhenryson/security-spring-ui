import { TestBed } from '@angular/core/testing';
import { AuthStore } from './auth.store';
import { CurrentUser } from './models/auth.models';

const MOCK_USER: CurrentUser = {
  id: 1,
  username: 'alice',
  email: 'alice@example.com',
  enabled: true,
  emailVerified: true,
  pendingEmail: null,
  roles: ['ADMIN'],
  permissions: ['USER_READ', 'USER_CREATE'],
};

describe('AuthStore', () => {
  let store: AuthStore;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({});
    store = TestBed.inject(AuthStore);
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // ── Estado inicial ────────────────────────────────────────────────────────

  it('deve iniciar sem token e sem usuário', () => {
    expect(store.accessToken()).toBeNull();
    expect(store.currentUser()).toBeNull();
    expect(store.isAuthenticated()).toBe(false);
  });

  // ── setAccessToken ────────────────────────────────────────────────────────

  it('deve marcar isAuthenticated true após setAccessToken', () => {
    store.setAccessToken('token-abc');
    expect(store.isAuthenticated()).toBe(true);
    expect(store.accessToken()).toBe('token-abc');
  });

  it('deve marcar isAuthenticated false ao setar token null', () => {
    store.setAccessToken('token-abc');
    store.setAccessToken(null);
    expect(store.isAuthenticated()).toBe(false);
  });

  // ── setCurrentUser ────────────────────────────────────────────────────────

  it('deve expor permissions e roles do usuário como computed', () => {
    store.setCurrentUser(MOCK_USER);
    expect(store.permissions()).toEqual(['USER_READ', 'USER_CREATE']);
    expect(store.roles()).toEqual(['ADMIN']);
  });

  it('deve retornar arrays vazios quando não há usuário', () => {
    expect(store.permissions()).toEqual([]);
    expect(store.roles()).toEqual([]);
  });

  // ── hasPermission / hasRole ───────────────────────────────────────────────

  it('hasPermission retorna true para permissão existente', () => {
    store.setCurrentUser(MOCK_USER);
    expect(store.hasPermission('USER_READ')).toBe(true);
  });

  it('hasPermission retorna false para permissão ausente', () => {
    store.setCurrentUser(MOCK_USER);
    expect(store.hasPermission('USER_DELETE')).toBe(false);
  });

  it('hasRole retorna true para role existente', () => {
    store.setCurrentUser(MOCK_USER);
    expect(store.hasRole('ADMIN')).toBe(true);
  });

  it('hasRole retorna false para role ausente', () => {
    store.setCurrentUser(MOCK_USER);
    expect(store.hasRole('MODERATOR')).toBe(false);
  });

  // ── hasPendingEmail / isEmailVerified ─────────────────────────────────────

  it('hasPendingEmail é false quando pendingEmail é null', () => {
    store.setCurrentUser(MOCK_USER);
    expect(store.hasPendingEmail()).toBe(false);
  });

  it('hasPendingEmail é true quando pendingEmail está definido', () => {
    store.setCurrentUser({ ...MOCK_USER, pendingEmail: 'nova@example.com' });
    expect(store.hasPendingEmail()).toBe(true);
  });

  it('isEmailVerified reflete o campo do usuário', () => {
    store.setCurrentUser({ ...MOCK_USER, emailVerified: false });
    expect(store.isEmailVerified()).toBe(false);
  });

  // ── userInitials ──────────────────────────────────────────────────────────

  it('userInitials retorna as 2 primeiras letras em maiúsculo', () => {
    store.setCurrentUser(MOCK_USER);
    expect(store.userInitials()).toBe('AL');
  });

  it('userInitials retorna "?" quando não há usuário', () => {
    expect(store.userInitials()).toBe('?');
  });

  it('userInitials retorna "?" para username vazio', () => {
    store.setCurrentUser({ ...MOCK_USER, username: '' });
    expect(store.userInitials()).toBe('?');
  });

  // ── setDevToken / clearDevToken ───────────────────────────────────────────

  it('setDevToken persiste token e expiração no sessionStorage', () => {
    store.setDevToken('dev-xyz', 3600);
    expect(store.devAccessToken()).toBe('dev-xyz');
    expect(store.isDevElevated()).toBe(true);
    expect(sessionStorage.getItem('ss_dev_token')).toBe('dev-xyz');
    expect(Number(sessionStorage.getItem('ss_dev_expires'))).toBeGreaterThan(Date.now());
  });

  it('clearDevToken limpa signals e sessionStorage', () => {
    store.setDevToken('dev-xyz', 3600);
    store.clearDevToken();
    expect(store.devAccessToken()).toBeNull();
    expect(store.isDevElevated()).toBe(false);
    expect(sessionStorage.getItem('ss_dev_token')).toBeNull();
    expect(sessionStorage.getItem('ss_dev_expires')).toBeNull();
  });

  it('restaura devToken do sessionStorage se não expirou', () => {
    const expires = Date.now() + 3_600_000;
    sessionStorage.setItem('ss_dev_token', 'restored-dev');
    sessionStorage.setItem('ss_dev_expires', String(expires));
    // recria o store para simular reload
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const freshStore = TestBed.inject(AuthStore);
    expect(freshStore.devAccessToken()).toBe('restored-dev');
    expect(freshStore.isDevElevated()).toBe(true);
  });

  it('não restaura devToken expirado do sessionStorage', () => {
    sessionStorage.setItem('ss_dev_token', 'expired-dev');
    sessionStorage.setItem('ss_dev_expires', String(Date.now() - 1000));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const freshStore = TestBed.inject(AuthStore);
    expect(freshStore.devAccessToken()).toBeNull();
    expect(freshStore.isDevElevated()).toBe(false);
  });

  // ── clear ─────────────────────────────────────────────────────────────────

  it('clear deve limpar token, usuário, localStorage e sessionStorage', () => {
    localStorage.setItem('ss_refresh_token', 'refresh-abc');
    store.setAccessToken('token-abc');
    store.setCurrentUser(MOCK_USER);
    store.setDevToken('dev-xyz', 3600);

    store.clear();

    expect(store.accessToken()).toBeNull();
    expect(store.currentUser()).toBeNull();
    expect(store.isAuthenticated()).toBe(false);
    expect(store.devAccessToken()).toBeNull();
    expect(localStorage.getItem('ss_refresh_token')).toBeNull();
    expect(sessionStorage.getItem('ss_dev_token')).toBeNull();
    expect(sessionStorage.getItem('ss_dev_expires')).toBeNull();
  });

});
