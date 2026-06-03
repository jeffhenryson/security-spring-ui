import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HasRoleDirective } from './has-role.directive';
import { AuthStore } from '../auth/auth.store';
import { CurrentUser } from '../auth/models/auth.models';

const BASE_USER: CurrentUser = {
  id: 1,
  username: 'u',
  email: 'u@e.com',
  enabled: true,
  emailVerified: true,
  pendingEmail: null,
  roles: [],
  permissions: [],
};

// Host com input estático — usado pela maioria dos testes
@Component({
  standalone: true,
  imports: [HasRoleDirective],
  template: `<span *hasRole="'ADMIN'" data-testid="content">visible</span>`,
})
class StaticRoleHostComponent {}


describe('HasRoleDirective', () => {
  let store: AuthStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [StaticRoleHostComponent],
    });
    store = TestBed.inject(AuthStore);
  });

  // ── Input estático ──────────────────────────────────────────────────────────

  describe('input estático', () => {
    it('exibe o conteúdo quando o usuário tem a role', () => {
      store.setCurrentUser({ ...BASE_USER, roles: ['ADMIN'] });
      const fixture = TestBed.createComponent(StaticRoleHostComponent);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="content"]')).not.toBeNull();
    });

    it('oculta o conteúdo quando o usuário não tem a role', () => {
      store.setCurrentUser({ ...BASE_USER, roles: [] });
      const fixture = TestBed.createComponent(StaticRoleHostComponent);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="content"]')).toBeNull();
    });

    it('oculta o conteúdo quando não há usuário logado', () => {
      const fixture = TestBed.createComponent(StaticRoleHostComponent);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="content"]')).toBeNull();
    });
  });

  // ── Mudança de roles via store ───────────────────────────────────────────────

  describe('mudança de roles via store', () => {
    it('exibe o conteúdo quando store.roles() passa a incluir a role', () => {
      store.setCurrentUser({ ...BASE_USER, roles: [] });
      const fixture = TestBed.createComponent(StaticRoleHostComponent);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="content"]')).toBeNull();

      store.setCurrentUser({ ...BASE_USER, roles: ['ADMIN'] });
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="content"]')).not.toBeNull();
    });

    it('oculta o conteúdo quando store.roles() deixa de incluir a role', () => {
      store.setCurrentUser({ ...BASE_USER, roles: ['ADMIN'] });
      const fixture = TestBed.createComponent(StaticRoleHostComponent);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="content"]')).not.toBeNull();

      store.setCurrentUser({ ...BASE_USER, roles: [] });
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="content"]')).toBeNull();
    });
  });

});
