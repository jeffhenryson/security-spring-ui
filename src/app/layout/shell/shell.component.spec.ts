import { TestBed } from '@angular/core/testing';
import { Router, NavigationStart, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { ShellComponent } from './shell.component';
import { AuthStore } from '../../core/auth/auth.store';

const BASE_USER = {
  id: 1,
  username: 'alice',
  email: 'alice@example.com',
  enabled: true,
  emailVerified: true,
  pendingEmail: null as string | null,
  roles: [] as string[],
  permissions: [] as string[],
};

function buildTestBed() {
  const events$ = new Subject<unknown>();
  const router = { events: events$.asObservable() } as unknown as Router;

  TestBed.configureTestingModule({
    imports: [ShellComponent],
    providers: [{ provide: Router, useValue: router }],
  }).overrideTemplate(ShellComponent, '');

  const fixture = TestBed.createComponent(ShellComponent);
  const component = fixture.componentInstance;
  const store = TestBed.inject(AuthStore);
  fixture.detectChanges();
  return { component, store, events$ };
}

describe('ShellComponent', () => {
  beforeEach(() => TestBed.resetTestingModule());

  // ── emailBannerDismissed ──────────────────────────────────────────────────

  it('emailBannerDismissed inicia como false', () => {
    const { component } = buildTestBed();
    expect(component.emailBannerDismissed()).toBe(false);
  });

  it('emailBannerDismissed pode ser ativado', () => {
    const { component } = buildTestBed();
    component.emailBannerDismissed.set(true);
    expect(component.emailBannerDismissed()).toBe(true);
  });

  // ── showEmailBanner ───────────────────────────────────────────────────────

  it('showEmailBanner = false quando não há usuário logado', () => {
    const { component } = buildTestBed();
    expect(component.showEmailBanner()).toBe(false);
  });

  it('showEmailBanner = false quando email verificado', () => {
    const { component, store } = buildTestBed();
    store.setCurrentUser({ ...BASE_USER, emailVerified: true });
    expect(component.showEmailBanner()).toBe(false);
  });

  it('showEmailBanner = true quando email não verificado', () => {
    const { component, store } = buildTestBed();
    store.setCurrentUser({ ...BASE_USER, emailVerified: false });
    expect(component.showEmailBanner()).toBe(true);
  });

  it('showEmailBanner = true quando não há email cadastrado', () => {
    const { component, store } = buildTestBed();
    store.setCurrentUser({ ...BASE_USER, email: '' });
    expect(component.showEmailBanner()).toBe(true);
  });

  // ── emailNotVerified ──────────────────────────────────────────────────────

  it('emailNotVerified = true quando email existe mas não verificado', () => {
    const { component, store } = buildTestBed();
    store.setCurrentUser({ ...BASE_USER, email: 'alice@test.com', emailVerified: false });
    expect(component.emailNotVerified()).toBe(true);
  });

  it('emailNotVerified = false quando não há email (sem email ≠ não verificado)', () => {
    const { component, store } = buildTestBed();
    store.setCurrentUser({ ...BASE_USER, email: '' });
    expect(component.emailNotVerified()).toBe(false);
  });

  // ── navigating ────────────────────────────────────────────────────────────

  it('navigating inicia como false', () => {
    const { component } = buildTestBed();
    expect(component.navigating()).toBe(false);
  });

  it('navigating = true após NavigationStart', () => {
    const { component, events$ } = buildTestBed();
    events$.next(new NavigationStart(1, '/app/dashboard'));
    expect(component.navigating()).toBe(true);
  });

  it('navigating = false após NavigationEnd', () => {
    const { component, events$ } = buildTestBed();
    events$.next(new NavigationStart(1, '/app/dashboard'));
    events$.next(new NavigationEnd(1, '/app/dashboard', '/app/dashboard'));
    expect(component.navigating()).toBe(false);
  });

  // ── getAnimation ──────────────────────────────────────────────────────────

  it('getAnimation retorna string vazia quando outlet sem rota ativa', () => {
    const { component } = buildTestBed();
    expect(component.getAnimation(null as any)).toBe('');
  });

  it('getAnimation retorna o title da rota ativa', () => {
    const { component } = buildTestBed();
    const outlet = { activatedRouteData: { title: 'Dashboard' } } as any;
    expect(component.getAnimation(outlet)).toBe('Dashboard');
  });
});
