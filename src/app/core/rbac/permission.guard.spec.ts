import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { authGuard, alreadyAuthGuard, permissionGuard } from './permission.guard';
import { AuthStore } from '../auth/auth.store';

function runGuard(guardFn: () => boolean | UrlTree): boolean | UrlTree {
  return TestBed.runInInjectionContext(guardFn);
}

describe('authGuard', () => {
  let store: AuthStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: Router, useValue: { createUrlTree: (cmds: string[]) => cmds } }],
    });
    store = TestBed.inject(AuthStore);
  });

  it('retorna true quando autenticado', () => {
    store.setAccessToken('tok');
    expect(runGuard(() => authGuard({} as any, {} as any))).toBe(true);
  });

  it('redireciona para /auth/login quando não autenticado', () => {
    const result = runGuard(() => authGuard({} as any, {} as any));
    expect(result).toEqual(['/auth/login']);
  });
});

describe('alreadyAuthGuard', () => {
  let store: AuthStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: Router, useValue: { createUrlTree: (cmds: string[]) => cmds } }],
    });
    store = TestBed.inject(AuthStore);
  });

  it('redireciona para /app/dashboard quando já autenticado', () => {
    store.setAccessToken('tok');
    const result = runGuard(() => alreadyAuthGuard({} as any, {} as any));
    expect(result).toEqual(['/app/dashboard']);
  });

  it('retorna true quando não autenticado (permite acessar login/register)', () => {
    expect(runGuard(() => alreadyAuthGuard({} as any, {} as any))).toBe(true);
  });
});

describe('permissionGuard', () => {
  let store: AuthStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: Router, useValue: { createUrlTree: (cmds: string[]) => cmds } }],
    });
    store = TestBed.inject(AuthStore);
  });

  it('retorna true quando usuário tem a permissão', () => {
    store.setAccessToken('tok');
    store.setCurrentUser({
      id: 1,
      username: 'u',
      email: 'u@e.com',
      enabled: true,
      emailVerified: true,
      pendingEmail: null,
      roles: [],
      permissions: ['USER_READ'],
    });
    const guard = permissionGuard('USER_READ');
    expect(runGuard(() => guard({} as any, {} as any))).toBe(true);
  });

  it('redireciona para /app/access-denied quando falta a permissão', () => {
    store.setAccessToken('tok');
    store.setCurrentUser({
      id: 1,
      username: 'u',
      email: 'u@e.com',
      enabled: true,
      emailVerified: true,
      pendingEmail: null,
      roles: [],
      permissions: [],
    });
    const guard = permissionGuard('USER_DELETE');
    const result = runGuard(() => guard({} as any, {} as any));
    expect(result).toEqual(['/app/access-denied']);
  });

  it('redireciona para /auth/login quando não autenticado', () => {
    const guard = permissionGuard('USER_READ');
    const result = runGuard(() => guard({} as any, [] as any));
    expect(result).toEqual(['/auth/login']);
  });
});
