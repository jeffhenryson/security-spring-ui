import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SidebarComponent } from './sidebar.component';
import { AuthStore } from '../../core/auth/auth.store';

const SIDEBAR_COLLAPSE_KEY = 'ss_sidebar_collapsed';

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

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let store: AuthStore;

  function createComponent() {
    const fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    return fixture;
  }

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [provideRouter([])],
    })
      .overrideTemplate(SidebarComponent, '')
      .compileComponents();

    store = TestBed.inject(AuthStore);
    store.setCurrentUser(BASE_USER);
  });

  // ── collapsed ─────────────────────────────────────────────────────────────

  it('collapsed inicia false quando localStorage não tem o valor', () => {
    createComponent();
    expect(component.collapsed()).toBe(false);
  });

  it('collapsed inicia true quando localStorage tem "1"', () => {
    localStorage.setItem(SIDEBAR_COLLAPSE_KEY, '1');
    createComponent();
    expect(component.collapsed()).toBe(true);
  });

  it('toggleCollapsed inverte collapsed e persiste no localStorage', () => {
    createComponent();
    expect(component.collapsed()).toBe(false);

    component.toggleCollapsed();
    expect(component.collapsed()).toBe(true);
    expect(localStorage.getItem(SIDEBAR_COLLAPSE_KEY)).toBe('1');

    component.toggleCollapsed();
    expect(component.collapsed()).toBe(false);
    expect(localStorage.getItem(SIDEBAR_COLLAPSE_KEY)).toBe('0');
  });

  // ── RBAC ──────────────────────────────────────────────────────────────────

  it('canSeeModules = false quando usuário não tem role ADMIN', () => {
    createComponent();
    expect(component.canSeeModules()).toBe(false);
  });

  it('canSeeModules = true quando usuário tem role ADMIN', () => {
    store.setCurrentUser({ ...BASE_USER, roles: ['ROLE_ADMIN'] });
    createComponent();
    expect(component.canSeeModules()).toBe(true);
  });

  // ── signals derivados do store ────────────────────────────────────────────

  it('username deriva do currentUser', () => {
    createComponent();
    expect(component.username()).toBe('alice');
  });

  it('userEmail deriva do currentUser', () => {
    createComponent();
    expect(component.userEmail()).toBe('alice@example.com');
  });

  it('userInitials são as 2 primeiras letras em maiúsculo', () => {
    createComponent();
    expect(component.userInitials()).toBe('AL');
  });
});
