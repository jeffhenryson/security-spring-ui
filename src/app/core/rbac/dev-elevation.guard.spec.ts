import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, UrlSegment, UrlTree } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { devElevationGuard } from './dev-elevation.guard';

function makeStore(elevated: boolean) {
  return {
    isDevElevated: jest.fn(() => elevated),
  } as unknown as AuthStore;
}

function makeRouter() {
  return {
    createUrlTree: jest.fn((path: string[], opts: unknown) => ({ path, opts }) as unknown as UrlTree),
  } as unknown as Router;
}

function runGuard(elevated: boolean, segments: string[] = ['settings', 'permissions']) {
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthStore, useValue: makeStore(elevated) },
      { provide: Router, useValue: makeRouter() },
    ],
  });
  return TestBed.runInInjectionContext(() =>
    devElevationGuard(
      {} as ActivatedRouteSnapshot,
      segments.map((s) => ({ path: s }) as UrlSegment),
    ),
  );
}

describe('devElevationGuard', () => {
  it('retorna true quando DEV token está ativo', () => {
    expect(runGuard(true)).toBe(true);
  });

  it('retorna UrlTree com devRequired quando não há elevação', () => {
    const result = runGuard(false, ['settings', 'permissions']);
    expect(result).not.toBe(true);
    const router = TestBed.inject(Router);
    expect(router.createUrlTree).toHaveBeenCalledWith(
      ['/app/settings'],
      expect.objectContaining({ queryParams: expect.objectContaining({ devRequired: 'true' }) }),
    );
  });

  it('inclui returnUrl na query ao redirecionar', () => {
    runGuard(false, ['settings', 'dev-logs']);
    const router = TestBed.inject(Router);
    expect(router.createUrlTree).toHaveBeenCalledWith(
      ['/app/settings'],
      expect.objectContaining({
        queryParams: expect.objectContaining({ returnUrl: '/settings/dev-logs' }),
      }),
    );
  });
});
