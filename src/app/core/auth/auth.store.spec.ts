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
    TestBed.configureTestingModule({});
    store = TestBed.inject(AuthStore);
    localStorage.clear();
  });

  afterEach(() => localStorage.clear());

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

  // ── clear ─────────────────────────────────────────────────────────────────

  it('clear deve limpar token, usuário e localStorage', () => {
    localStorage.setItem('ss_refresh_token', 'refresh-abc');
    store.setAccessToken('token-abc');
    store.setCurrentUser(MOCK_USER);

    store.clear();

    expect(store.accessToken()).toBeNull();
    expect(store.currentUser()).toBeNull();
    expect(store.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('ss_refresh_token')).toBeNull();
  });

});
