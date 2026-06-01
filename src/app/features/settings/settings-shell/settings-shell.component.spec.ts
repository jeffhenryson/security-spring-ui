import { TestBed } from '@angular/core/testing';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { SettingsShellComponent } from './settings-shell.component';
import { AuthStore } from '../../../core/auth/auth.store';

function makeRouter() {
  return { events: new Subject<NavigationEnd>().asObservable(), navigate: jest.fn() } as unknown as Router;
}

function makeActivatedRoute() {
  return {
    firstChild: null,
    snapshot: {
      data: {},
      queryParamMap: { get: jest.fn(() => null) },
    },
  } as unknown as ActivatedRoute;
}

function makeStore(roles: string[] = [], elevated = false) {
  const isAdmin = roles.some((r) => r === 'ADMIN' || r === 'ROLE_ADMIN');
  const perms = isAdmin
    ? ['USER_READ', 'ROLE_READ', 'AUDIT_READ']
    : [];
  return {
    hasRole: jest.fn((role: string) => roles.includes(role)),
    hasPermission: jest.fn(() => isAdmin),
    permissions: jest.fn(() => perms),
    isDevElevated: jest.fn(() => elevated),
    devSecondsLeft: jest.fn(() => 0),
    devTokenExpiresAt: jest.fn(() => 0),
    clearDevToken: jest.fn(),
  } as unknown as AuthStore;
}

describe('SettingsShellComponent', () => {
  let component: SettingsShellComponent;

  function setup(roles: string[] = [], elevated = false) {
    TestBed.configureTestingModule({
      imports: [SettingsShellComponent],
      providers: [
        { provide: AuthStore, useValue: makeStore(roles, elevated) },
        { provide: Router, useValue: makeRouter() },
        { provide: ActivatedRoute, useValue: makeActivatedRoute() },
      ],
    }).overrideTemplate(SettingsShellComponent, '');
    const fixture = TestBed.createComponent(SettingsShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    return fixture;
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
      const sections = component.visibleSections();
      expect(sections).toHaveLength(1);
      expect(sections[0].title).toBe('Conta');
    });

    it('com role ADMIN: exibe "Conta" + "Administração"', () => {
      setup(['ADMIN']);
      const sections = component.visibleSections();
      expect(sections).toHaveLength(2);
      expect(sections[1].title).toBe('Administração');
    });

    it('com role ROLE_ADMIN: exibe "Conta" + "Administração"', () => {
      setup(['ROLE_ADMIN']);
      const sections = component.visibleSections();
      expect(sections).toHaveLength(2);
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
      const devSection = component.visibleSections().find((s) => s.title === 'Desenvolvedor');
      expect(devSection).toBeUndefined();
    });
  });
});
