import { TestBed } from '@angular/core/testing';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { signal } from '@angular/core';
import { Subject } from 'rxjs';
import { SettingsShellComponent } from './settings-shell.component';
import { AuthStore } from '../../../core/auth/auth.store';

function makeRouter() {
  return {
    events: new Subject<NavigationEnd>().asObservable(),
    navigate: jest.fn(),
    navigateByUrl: jest.fn(),
  } as unknown as Router;
}

function makeActivatedRoute(params: Record<string, string | null> = {}) {
  return {
    firstChild: null,
    snapshot: {
      data: {},
      queryParamMap: { get: (key: string) => params[key] ?? null },
    },
  } as unknown as ActivatedRoute;
}

function makeStore(roles: string[] = [], elevated = false, totpEnabled = false) {
  const isAdmin = roles.some((r) => r === 'ADMIN' || r === 'ROLE_ADMIN');
  const perms = isAdmin ? ['USER_READ', 'ROLE_READ', 'AUDIT_READ'] : [];
  return {
    hasRole: jest.fn((role: string) =>
      roles.includes(role) || (isAdmin && role === 'ROLE_ADMIN'),
    ),
    hasPermission: jest.fn(() => isAdmin),
    permissions: jest.fn(() => perms),
    isDevElevated: signal(elevated),
    devTokenExpiresAt: signal(0),
    currentUser: signal(totpEnabled ? { totpEnabled: true } : null),
    clearDevToken: jest.fn(),
  } as unknown as AuthStore;
}

describe('SettingsShellComponent', () => {
  let component: SettingsShellComponent;

  function setup(
    roles: string[] = [],
    elevated = false,
    routeParams: Record<string, string | null> = {},
    totpEnabled = false,
  ) {
    const router = makeRouter();
    TestBed.configureTestingModule({
      imports: [SettingsShellComponent],
      providers: [
        { provide: AuthStore, useValue: makeStore(roles, elevated, totpEnabled) },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: makeActivatedRoute(routeParams) },
      ],
    }).overrideTemplate(SettingsShellComponent, '');
    const fixture = TestBed.createComponent(SettingsShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    return { fixture, router };
  }

  it('cria o componente', () => {
    setup();
    expect(component).toBeTruthy();
  });

  it('mobileOpen inicia como false', () => {
    setup();
    expect(component.mobileOpen()).toBe(false);
  });

  it('mobileOpen pode ser alternado', () => {
    setup();
    component.mobileOpen.update((v) => !v);
    expect(component.mobileOpen()).toBe(true);
  });

  describe('visibleSections', () => {
    it('sem roles admin: exibe apenas seção "Conta"', () => {
      setup([]);
      expect(component.visibleSections()).toHaveLength(1);
      expect(component.visibleSections()[0].title).toBe('Conta');
    });

    it('com role ADMIN: exibe "Conta" + "Administração"', () => {
      setup(['ADMIN']);
      const sections = component.visibleSections();
      expect(sections).toHaveLength(2);
      expect(sections[1].title).toBe('Administração');
    });

    it('com role ROLE_ADMIN: exibe "Conta" + "Administração"', () => {
      setup(['ROLE_ADMIN']);
      expect(component.visibleSections()).toHaveLength(2);
    });

    it('seção "Conta" tem 3 itens (perfil, segurança, tema)', () => {
      setup();
      expect(component.visibleSections()[0].items).toHaveLength(3);
    });

    it('seção "Administração" tem 3 itens (usuários, roles, audit-logs)', () => {
      setup(['ADMIN']);
      const adminSection = component.visibleSections().find((s) => s.title === 'Administração')!;
      expect(adminSection.items).toHaveLength(3);
    });

    it('seção "Desenvolvedor" não aparece sem elevação ativa', () => {
      setup(['ROLE_DEV'], false);
      expect(component.visibleSections().find((s) => s.title === 'Desenvolvedor')).toBeUndefined();
    });
  });

  describe('fluxo devRequired', () => {
    it('abre modal quando devRequired=true, não elevado e usuário tem 2FA', () => {
      setup([], false, { devRequired: 'true', returnUrl: '/app/settings/dev-system' }, true);
      expect(component.showElevationModal()).toBe(true);
    });

    it('não abre modal quando devRequired=true mas já está elevado', () => {
      setup([], true, { devRequired: 'true', returnUrl: '/app/settings/dev-system' }, true);
      expect(component.showElevationModal()).toBe(false);
    });

    it('onElevated() navega ao returnUrl pendente e fecha modal', () => {
      const { router } = setup([], false, { devRequired: 'true', returnUrl: '/app/settings/dev-system' }, true);
      component.onElevated();
      expect(component.showElevationModal()).toBe(false);
      expect(router.navigateByUrl).toHaveBeenCalledWith('/app/settings/dev-system');
    });

    it('onElevated() sem returnUrl pendente apenas fecha modal', () => {
      const { router } = setup([], false, {});
      component.showElevationModal.set(true);
      component.onElevated();
      expect(component.showElevationModal()).toBe(false);
      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });

    it('onElevated() consome returnUrl uma única vez', () => {
      const { router } = setup([], false, { returnUrl: '/app/settings/dev-system' }, true);
      component.onElevated();
      component.onElevated();
      expect(router.navigateByUrl).toHaveBeenCalledTimes(1);
    });
  });
});
