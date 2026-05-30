import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { signal } from '@angular/core';
import { TopbarComponent } from './topbar.component';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService, Theme } from '../../core/theme/theme.service';

function makeThemeService(initial: Theme) {
  const _theme = signal<Theme>(initial);
  return {
    theme: _theme.asReadonly(),
    resolvedTheme: signal<'dark' | 'light'>('dark').asReadonly(),
    setTheme: jest.fn((t: Theme) => _theme.set(t)),
  };
}

function buildTestBed(initialTheme: Theme) {
  const routerEvents$ = new Subject<unknown>();
  const authService = { logout: jest.fn().mockResolvedValue(undefined) };
  const themeService = makeThemeService(initialTheme);

  TestBed.configureTestingModule({
    imports: [TopbarComponent],
    providers: [
      { provide: Router, useValue: { events: routerEvents$.asObservable(), navigate: jest.fn() } },
      {
        provide: ActivatedRoute,
        useValue: { firstChild: null, snapshot: { data: { title: 'Dashboard' } } },
      },
      { provide: AuthService, useValue: authService },
      { provide: ThemeService, useValue: themeService },
    ],
  })
    .overrideTemplate(TopbarComponent, '')
    .compileComponents();

  const fixture = TestBed.createComponent(TopbarComponent);
  fixture.detectChanges();
  return { component: fixture.componentInstance, authService, themeService, routerEvents$ };
}

describe('TopbarComponent', () => {
  beforeEach(() => TestBed.resetTestingModule());

  // ── themeIcon ─────────────────────────────────────────────────────────────

  it('themeIcon = dark_mode quando tema é dark', () => {
    const { component } = buildTestBed('dark');
    expect(component.themeIcon()).toBe('dark_mode');
  });

  it('themeIcon = light_mode quando tema é light', () => {
    const { component } = buildTestBed('light');
    expect(component.themeIcon()).toBe('light_mode');
  });

  it('themeIcon = settings_brightness quando tema é system', () => {
    const { component } = buildTestBed('system');
    expect(component.themeIcon()).toBe('settings_brightness');
  });

  // ── themeTooltip ──────────────────────────────────────────────────────────

  it('themeTooltip contém "escuro" quando tema é dark', () => {
    const { component } = buildTestBed('dark');
    expect(component.themeTooltip()).toContain('escuro');
  });

  it('themeTooltip contém "claro" quando tema é light', () => {
    const { component } = buildTestBed('light');
    expect(component.themeTooltip()).toContain('claro');
  });

  it('themeTooltip contém "sistema" quando tema é system', () => {
    const { component } = buildTestBed('system');
    expect(component.themeTooltip()).toContain('sistema');
  });

  // ── toggleTheme ───────────────────────────────────────────────────────────

  it('toggleTheme: dark → light', () => {
    const { component, themeService } = buildTestBed('dark');
    component.toggleTheme();
    expect(themeService.setTheme).toHaveBeenCalledWith('light');
  });

  it('toggleTheme: light → system', () => {
    const { component, themeService } = buildTestBed('light');
    component.toggleTheme();
    expect(themeService.setTheme).toHaveBeenCalledWith('system');
  });

  it('toggleTheme: system → dark', () => {
    const { component, themeService } = buildTestBed('system');
    component.toggleTheme();
    expect(themeService.setTheme).toHaveBeenCalledWith('dark');
  });

  // ── logout ────────────────────────────────────────────────────────────────

  it('logout chama authService.logout', async () => {
    const { component, authService } = buildTestBed('dark');
    await component.logout();
    expect(authService.logout).toHaveBeenCalled();
  });

  it('loggingOut fica false após logout concluído', async () => {
    const { component } = buildTestBed('dark');
    await component.logout();
    expect(component.loggingOut()).toBe(false);
  });

  it('loggingOut fica false mesmo após falha no logout', async () => {
    const { component, authService } = buildTestBed('dark');
    authService.logout.mockRejectedValueOnce(new Error('network'));
    try {
      await component.logout();
    } catch {
      /* componente não faz catch — erro sobe, mas loggingOut deve ser restaurado */
    }
    expect(component.loggingOut()).toBe(false);
  });

  // ── pageTitle ─────────────────────────────────────────────────────────────

  it('pageTitle usa title da snapshot da rota ativa', () => {
    const { component, routerEvents$ } = buildTestBed('dark');
    routerEvents$.next(new NavigationEnd(1, '/app/dashboard', '/app/dashboard'));
    expect(component.pageTitle()).toBe('Dashboard');
  });
});
