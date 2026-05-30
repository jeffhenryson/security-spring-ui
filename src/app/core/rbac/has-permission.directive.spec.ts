import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HasPermissionDirective } from './has-permission.directive';
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
  imports: [HasPermissionDirective],
  template: `<span *hasPermission="'USER_READ'" data-testid="content">visible</span>`,
})
class StaticPermHostComponent {}


describe('HasPermissionDirective', () => {
  let store: AuthStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [StaticPermHostComponent],
    });
    store = TestBed.inject(AuthStore);
  });

  // ── Input estático ──────────────────────────────────────────────────────────

  describe('input estático', () => {
    it('exibe o conteúdo quando o usuário tem a permissão', () => {
      store.setCurrentUser({ ...BASE_USER, permissions: ['USER_READ'] });
      const fixture = TestBed.createComponent(StaticPermHostComponent);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="content"]')).not.toBeNull();
    });

    it('oculta o conteúdo quando o usuário não tem a permissão', () => {
      store.setCurrentUser({ ...BASE_USER, permissions: [] });
      const fixture = TestBed.createComponent(StaticPermHostComponent);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="content"]')).toBeNull();
    });

    it('oculta o conteúdo quando não há usuário logado', () => {
      const fixture = TestBed.createComponent(StaticPermHostComponent);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="content"]')).toBeNull();
    });
  });

  // ── Mudança de permissões via store ─────────────────────────────────────────

  describe('mudança de permissões via store', () => {
    it('exibe o conteúdo quando store.permissions() passa a incluir a permissão', () => {
      store.setCurrentUser({ ...BASE_USER, permissions: [] });
      const fixture = TestBed.createComponent(StaticPermHostComponent);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="content"]')).toBeNull();

      store.setCurrentUser({ ...BASE_USER, permissions: ['USER_READ'] });
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="content"]')).not.toBeNull();
    });

    it('oculta o conteúdo quando store.permissions() deixa de incluir a permissão', () => {
      store.setCurrentUser({ ...BASE_USER, permissions: ['USER_READ'] });
      const fixture = TestBed.createComponent(StaticPermHostComponent);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="content"]')).not.toBeNull();

      store.setCurrentUser({ ...BASE_USER, permissions: [] });
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="content"]')).toBeNull();
    });
  });

  // ── Limitação: @Input não é signal ──────────────────────────────────────────
  //
  // `this.permission` é uma string plana, não um signal. O effect() rastreia
  // `store.permissions()` mas NÃO rastreia mudanças no @Input. Por isso, se
  // apenas o binding do template mudar (sem que `store.permissions()` mude),
  // o effect não re-executa e o DOM não é atualizado.
  //
  // Esse comportamento não pode ser testado diretamente via detectChanges() pois
  // Angular 21 lança NG0100 (ExpressionChangedAfterChecked) ao mutar uma propriedade
  // de template após o primeiro ciclo de CD. A limitação está documentada aqui como
  // referência para futuros mantenedores:
  //
  //   1. Usuário tem USER_READ. Input é USER_DELETE → elemento oculto. ✓
  //   2. Input muda para USER_READ (sem store.permissions() mudar).
  //   3. Effect NÃO re-executa → elemento permanece oculto. ✗ (limitação)
  //
  // Para eliminar a limitação, converter `private permission = ''` em um signal
  // e usar `input()` (signal-based input) em vez de `@Input()`.
});
