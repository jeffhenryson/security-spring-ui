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

  // ── Limitação: @Input não é signal ──────────────────────────────────────────
  //
  // `this.role` é uma string plana, não um signal. O effect() rastreia
  // `store.roles()` mas NÃO rastreia mudanças no @Input. Por isso, se apenas
  // o binding do template mudar (sem que `store.roles()` mude), o effect não
  // re-executa e o DOM não é atualizado.
  //
  // Esse comportamento não pode ser testado diretamente via detectChanges() pois
  // Angular 21 lança NG0100 (ExpressionChangedAfterChecked) ao mutar uma propriedade
  // de template após o primeiro ciclo de CD. A limitação está documentada aqui como
  // referência para futuros mantenedores:
  //
  //   1. Usuário tem ADMIN. Input é MODERATOR → elemento oculto. ✓
  //   2. Input muda para ADMIN (sem store.roles() mudar).
  //   3. Effect NÃO re-executa → elemento permanece oculto. ✗ (limitação)
  //
  // Para eliminar a limitação, converter `private role = ''` em um signal
  // e usar `input()` (signal-based input) em vez de `@Input()`.
});
